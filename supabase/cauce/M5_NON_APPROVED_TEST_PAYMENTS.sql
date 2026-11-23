-- M5: Allow non-approved payment states with absent / unverified card fingerprint.
-- Preview-only Cauce migration. Security-critical approval path stays strict:
-- require independently verified test seller, exact order/reference/amount/ARS,
-- and official test-card proof whenever p_provider_status='approved'.
-- For pending/rejected no payment can be marked paid or decrement inventory.
-- Preserve service_role-only RPC permission and existing idempotency.
begin;

create or replace function public.cauce_checkout_apply_proven_test_payment(
  p_order_id uuid,p_payment_id text,p_preference_id text,p_provider_status text,
  p_amount numeric,p_currency text,p_live_mode boolean,
  p_test_seller_verified boolean,p_test_card_verified boolean
) returns text language plpgsql security definer set search_path = '' as $$
declare
  current_order public.cauce_orders%rowtype;
  entry record;
  reserved_others bigint;
  current_stock integer;
  current_version integer;
  next_status text;
begin
  if p_test_seller_verified is distinct from true
    -- Only an APPROVED payment can reserve a sale/debit stock.
    -- Pending/rejected provider responses sometimes omit the card fingerprint.
    or (p_provider_status = 'approved' and p_test_card_verified is distinct from true)
    or p_test_card_verified is null
    or p_live_mode is null or p_currency<>'ARS'
    or p_payment_id is null or char_length(p_payment_id) not between 1 and 120
    or p_provider_status not in ('approved','pending','in_process','rejected','cancelled')
    or p_amount is null then
    raise exception 'Not a proven test payment' using errcode='22023';
  end if;
  select * into current_order from public.cauce_orders where id=p_order_id for update;
  if not found or current_order.preference_id is null or current_order.preference_id<>p_preference_id
    or current_order.total_amount<>p_amount then
    raise exception 'Payment does not match order' using errcode='22023';
  end if;
  insert into public.cauce_payment_events(order_id,provider_payment_id,provider_status)
    values(p_order_id,p_payment_id,p_provider_status) on conflict do nothing;
  if current_order.status='paid_test' then
    if current_order.provider_payment_id<>p_payment_id then
      raise exception 'Conflicting payment requires manual review' using errcode='P0001';
    end if;
    return 'paid_test';
  end if;
  if current_order.status in ('failed_test','cancelled','needs_review') then
    if p_provider_status='approved' then
      update public.cauce_orders set status='needs_review',updated_at=now() where id=p_order_id;
      return 'needs_review';
    end if;
    return current_order.status;
  end if;
  if p_provider_status='approved' then
    if current_order.expires_at<=now() then
      update public.cauce_orders set status='needs_review',updated_at=now() where id=p_order_id;
      return 'needs_review';
    end if;
    for entry in select * from public.cauce_order_items where order_id=p_order_id order by product_id loop
      select stock,version into current_stock,current_version
        from public.cauce_inventory where product_id=entry.product_id for update;
      select coalesce(sum(oi.quantity),0) into reserved_others
        from public.cauce_order_items oi join public.cauce_orders o on o.id=oi.order_id
        where oi.product_id=entry.product_id and o.id<>p_order_id
          and o.status='pending' and o.expires_at>now();
      if current_stock-entry.quantity<reserved_others then
        update public.cauce_orders set status='needs_review',updated_at=now() where id=p_order_id;
        return 'needs_review';
      end if;
    end loop;
    update public.cauce_orders set status='paid_test',provider_payment_id=p_payment_id,
      updated_at=now() where id=p_order_id;
    for entry in select * from public.cauce_order_items where order_id=p_order_id order by product_id loop
      select stock,version into current_stock,current_version
        from public.cauce_inventory where product_id=entry.product_id for update;
      update public.cauce_inventory set stock=current_stock-entry.quantity,
        version=current_version+1,updated_at=now(),updated_by=null where product_id=entry.product_id;
      insert into public.cauce_inventory_movements
        (product_id,actor_id,previous_stock,new_stock,version,reason,order_id)
        values(entry.product_id,null,current_stock,current_stock-entry.quantity,current_version+1,
          'Venta de prueba confirmada',p_order_id);
    end loop;
    return 'paid_test';
  end if;
  if p_provider_status in ('rejected','cancelled') then
    next_status := 'failed_test';
    update public.cauce_orders set status=next_status,provider_payment_id=p_payment_id,
      updated_at=now() where id=p_order_id;
    return next_status;
  end if;
  return 'pending';
end;
$$;

revoke all on function public.cauce_checkout_apply_proven_test_payment(
  uuid,text,text,text,numeric,text,boolean,boolean,boolean
) from public,anon,authenticated;
grant execute on function public.cauce_checkout_apply_proven_test_payment(
  uuid,text,text,text,numeric,text,boolean,boolean,boolean
) to service_role;
commit;
