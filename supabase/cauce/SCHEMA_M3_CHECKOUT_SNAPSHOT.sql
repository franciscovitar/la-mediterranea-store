-- CAUCE COMMERCE LAB: audited source snapshot of the isolated M3 schema.
-- Apply ONLY to a fresh Cauce M2 database after SCHEMA_M2_DRAFT.sql and
-- HARDEN_M2_20261121.sql. Never run on the historic La Mediterránea project.
-- M3 was already installed independently in project erswrerhpmvviedudzit;
-- this snapshot is for repository review/recreation, NOT a migration reapply.
-- All payments are restricted to sandbox by server code and by live_mode=false.
begin;

alter table public.cauce_orders drop constraint cauce_orders_status_check;
alter table public.cauce_orders add constraint cauce_orders_status_check
  check (status in ('pending','paid_test','cancelled','failed_test','needs_review'));
alter table public.cauce_orders
  add column request_key uuid unique,
  add column currency text not null default 'ARS' check (currency = 'ARS'),
  add column preference_id text unique,
  add column provider_payment_id text unique,
  add column expires_at timestamptz not null default (now() + interval '30 minutes'),
  add column updated_at timestamptz not null default now();

alter table public.cauce_inventory_movements
  alter column actor_id drop not null,
  add column order_id uuid references public.cauce_orders(id) on delete restrict;

create table public.cauce_order_items (
  order_id uuid not null references public.cauce_orders(id) on delete restrict,
  product_id text not null references public.cauce_products(id) on delete restrict,
  product_name text not null,
  unit_price integer not null check (unit_price >= 0),
  quantity integer not null check (quantity between 1 and 99),
  primary key (order_id,product_id)
);
create index cauce_order_items_product_idx on public.cauce_order_items(product_id);

create table public.cauce_payment_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.cauce_orders(id) on delete restrict,
  provider_payment_id text not null,
  provider_status text not null,
  received_at timestamptz not null default now(),
  unique (provider_payment_id,provider_status)
);
create index cauce_payment_events_order_idx on public.cauce_payment_events(order_id);

alter table public.cauce_order_items enable row level security;
alter table public.cauce_payment_events enable row level security;
revoke all on public.cauce_order_items, public.cauce_payment_events from anon,authenticated;
grant select on public.cauce_order_items, public.cauce_payment_events to authenticated;
create policy cauce_staff_order_items_read on public.cauce_order_items for select to authenticated
  using (exists (select 1 from public.cauce_staff s where s.user_id = (select auth.uid())));
create policy cauce_staff_payment_events_read on public.cauce_payment_events for select to authenticated
  using (exists (select 1 from public.cauce_staff s where s.user_id = (select auth.uid())));

create function public.cauce_protect_reserved_stock()
returns trigger language plpgsql security definer set search_path = '' as $$
declare reserved_count bigint;
begin
  if new.stock < old.stock then
    select coalesce(sum(oi.quantity),0) into reserved_count
      from public.cauce_order_items oi join public.cauce_orders o on o.id=oi.order_id
      where oi.product_id=new.product_id and o.status='pending' and o.expires_at > now();
    if new.stock < reserved_count then
      raise exception 'Stock is reserved for pending checkouts' using errcode='40001';
    end if;
  end if;
  return new;
end;
$$;
create trigger cauce_reserved_stock_guard before update of stock on public.cauce_inventory
  for each row execute function public.cauce_protect_reserved_stock();

create function public.cauce_checkout_open(p_request_key uuid,p_lines jsonb)
returns table(order_id uuid,total_amount integer,expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  row_item jsonb;
  item_id text;
  item_quantity integer;
  item_name text;
  item_price integer;
  stock_count integer;
  reserved_count bigint;
  items_seen text[] := '{}';
  new_total bigint := 0;
  new_order uuid;
  existing public.cauce_orders%rowtype;
begin
  if p_request_key is null or jsonb_typeof(p_lines) is distinct from 'array'
    or jsonb_array_length(p_lines) not between 1 and 20 then
    raise exception 'Invalid checkout' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtext(p_request_key::text));
  select * into existing from public.cauce_orders where request_key=p_request_key for update;
  if found then
    return query select existing.id,existing.total_amount,existing.expires_at;
    return;
  end if;
  for row_item in select value from jsonb_array_elements(p_lines) order by value->>'productId' loop
    if jsonb_typeof(row_item) is distinct from 'object' then
      raise exception 'Invalid cart line' using errcode='22023';
    end if;
    item_id := row_item->>'productId';
    if item_id is null or item_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
      or char_length(item_id)>70 or item_id=any(items_seen)
      or coalesce(row_item->>'quantity','') !~ '^[1-9][0-9]?$' then
      raise exception 'Invalid or repeated product' using errcode='22023';
    end if;
    item_quantity := (row_item->>'quantity')::integer;
    items_seen := array_append(items_seen,item_id);
    select p.name,p.price,i.stock into item_name,item_price,stock_count
      from public.cauce_products p join public.cauce_inventory i on i.product_id=p.id
      where p.id=item_id and p.active for update of i;
    if not found or item_price<=0 then
      raise exception 'Unavailable product' using errcode='22023';
    end if;
    select coalesce(sum(oi.quantity),0) into reserved_count
      from public.cauce_order_items oi join public.cauce_orders o on o.id=oi.order_id
      where oi.product_id=item_id and o.status='pending' and o.expires_at>now();
    if item_quantity+reserved_count>stock_count then
      raise exception 'Insufficient stock' using errcode='P0001';
    end if;
    new_total := new_total+item_price::bigint*item_quantity;
  end loop;
  if new_total<=0 or new_total>1000000000 then
    raise exception 'Invalid total' using errcode='22023';
  end if;
  insert into public.cauce_orders(request_key,total_amount)
    values(p_request_key,new_total::integer) returning id into new_order;
  insert into public.cauce_order_items(order_id,product_id,product_name,unit_price,quantity)
    select new_order,p.id,p.name,p.price,(item.value->>'quantity')::integer
    from jsonb_array_elements(p_lines) item join public.cauce_products p on p.id=item.value->>'productId';
  return query select o.id,o.total_amount,o.expires_at from public.cauce_orders o where o.id=new_order;
end;
$$;

create function public.cauce_checkout_attach_preference(p_order_id uuid,p_preference_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare current_order public.cauce_orders%rowtype;
begin
  if char_length(coalesce(p_preference_id,'')) not between 5 and 160 then
    raise exception 'Invalid preference' using errcode='22023';
  end if;
  select * into current_order from public.cauce_orders where id=p_order_id for update;
  if not found or current_order.status<>'pending' or current_order.expires_at<=now()
    or (current_order.preference_id is not null and current_order.preference_id<>p_preference_id) then
    raise exception 'Checkout no longer pending' using errcode='P0001';
  end if;
  update public.cauce_orders set preference_id=p_preference_id,updated_at=now() where id=p_order_id;
end;
$$;

create function public.cauce_checkout_apply_payment(
  p_order_id uuid,p_payment_id text,p_preference_id text,p_provider_status text,
  p_amount numeric,p_currency text,p_live_mode boolean
) returns text language plpgsql security definer set search_path = '' as $$
declare
  current_order public.cauce_orders%rowtype;
  entry record;
  reserved_others bigint;
  current_stock integer;
  current_version integer;
  next_status text;
begin
  if p_live_mode is distinct from false or p_currency<>'ARS'
    or p_payment_id is null or char_length(p_payment_id) not between 1 and 120
    or p_provider_status not in ('approved','pending','in_process','rejected','cancelled')
    or p_amount is null then
    raise exception 'Not a valid test payment' using errcode='22023';
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

-- SECURITY DEFINER is required because inventory/orders are never guest writable.
-- All three entrypoints are server-only; no public or client-auth role may call them.
revoke all on function public.cauce_protect_reserved_stock() from public,anon,authenticated;
revoke all on function public.cauce_checkout_open(uuid,jsonb) from public,anon,authenticated;
revoke all on function public.cauce_checkout_attach_preference(uuid,text) from public,anon,authenticated;
revoke all on function public.cauce_checkout_apply_payment(uuid,text,text,text,numeric,text,boolean)
  from public,anon,authenticated;
grant execute on function public.cauce_checkout_open(uuid,jsonb) to service_role;
grant execute on function public.cauce_checkout_attach_preference(uuid,text) to service_role;
grant execute on function public.cauce_checkout_apply_payment(uuid,text,text,text,numeric,text,boolean)
  to service_role;
commit;
