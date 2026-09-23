begin;

alter table public.orders add column if not exists buyer_name text;
alter table public.orders add column if not exists buyer_phone text;
alter table public.orders add column if not exists buyer_notes text;
alter table public.orders add column if not exists fulfillment_method text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_fulfillment_method_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_fulfillment_method_check
      check (fulfillment_method is null or fulfillment_method in ('pickup','delivery'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_checkout_contact_email_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_checkout_contact_email_check
      check (buyer_name is null or buyer_email is not null);
  end if;
end
$$;

create table if not exists public.order_notifications (
  order_id uuid not null references public.orders(id) on delete cascade,
  kind text not null check (kind in ('buyer_paid','merchant_paid')),
  status text not null default 'processing' check (status in ('processing','sent','failed')),
  provider_email_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  primary key (order_id, kind)
);

drop trigger if exists order_notifications_set_updated_at on public.order_notifications;
create trigger order_notifications_set_updated_at before update on public.order_notifications
for each row execute function public.set_updated_at();

alter table public.order_notifications enable row level security;
revoke all on table public.order_notifications from anon, authenticated;

create or replace function public.create_checkout_order_v2(
  p_request_id uuid,
  p_items jsonb,
  p_buyer_name text,
  p_buyer_phone text,
  p_buyer_email text,
  p_fulfillment_method text,
  p_buyer_notes text default null
)
returns table (
  order_id uuid,
  total_amount numeric,
  checkout_url text,
  provider_order_id text
)
language plpgsql
as $$
declare
  v_order_id uuid;
  v_total numeric(12,2) := 0;
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty integer;
  v_color_key text;
  v_color_label text;
  v_size text;
  v_stock integer;
  v_name text := nullif(regexp_replace(trim(p_buyer_name), '\s+', ' ', 'g'), '');
  v_phone text := nullif(regexp_replace(trim(p_buyer_phone), '\s+', ' ', 'g'), '');
  v_email text := nullif(lower(trim(p_buyer_email)), '');
  v_notes text := nullif(trim(p_buyer_notes), '');
begin
  if p_request_id is null then raise exception 'checkout request id is required'; end if;
  if v_name is null or length(v_name) < 2 or length(v_name) > 120 then raise exception 'invalid buyer name'; end if;
  if v_phone is null or length(v_phone) > 40 or length(regexp_replace(v_phone, '\D', '', 'g')) < 6 then raise exception 'invalid buyer phone'; end if;
  if v_email is null
     or length(v_email) > 254
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  then
    raise exception 'invalid buyer email';
  end if;
  if v_notes is not null and length(v_notes) > 1000 then raise exception 'buyer notes too long'; end if;
  if p_fulfillment_method not in ('pickup','delivery') then raise exception 'invalid fulfillment method'; end if;

  return query
    select o.id, o.total_amount, o.mp_checkout_url, o.mp_order_id
    from public.orders o
    where o.checkout_request_id = p_request_id;
  if found then return; end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'cart is empty'; end if;

  insert into public.orders (
    checkout_request_id, buyer_email, buyer_name, buyer_phone, buyer_notes, fulfillment_method
  ) values (
    p_request_id, v_email, v_name, v_phone, v_notes, p_fulfillment_method
  ) returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity')::integer;
    if v_qty < 1 or v_qty > 99 then raise exception 'invalid quantity'; end if;

    select * into v_product
    from public.products
    where id = v_item->>'productId' and active
    for share;
    if not found then raise exception 'product not available: %', v_item->>'productId'; end if;

    v_color_key := nullif(v_item->>'colorKey', '');
    v_color_label := null;
    if exists (select 1 from public.product_colors c where c.product_id = v_product.id) then
      select c.label into v_color_label
      from public.product_colors c
      where c.product_id = v_product.id and c.key = v_color_key;
      if not found then raise exception 'invalid color for product %', v_product.id; end if;
    elsif v_color_key is not null then
      raise exception 'unexpected color for product %', v_product.id;
    end if;

    v_size := nullif(v_item->>'size', '');
    if exists (select 1 from public.product_sizes s where s.product_id = v_product.id) then
      if not exists (
        select 1 from public.product_sizes s
        where s.product_id = v_product.id and s.size = v_size
      ) then
        raise exception 'invalid size for product %', v_product.id;
      end if;
    elsif v_size is not null then
      raise exception 'unexpected size for product %', v_product.id;
    end if;

    select i.stock into v_stock
    from public.inventory i
    where i.product_id = v_product.id
      and i.color_key = coalesce(v_color_key, '')
      and i.size = coalesce(v_size, '');
    if found and v_stock < v_qty then raise exception 'insufficient stock for product %', v_product.id; end if;

    insert into public.order_items (
      order_id, product_id, product_name, color_key, color_label, size,
      quantity, unit_price, line_total
    ) values (
      v_order_id, v_product.id, v_product.name, v_color_key, v_color_label, v_size,
      v_qty, v_product.price, v_product.price * v_qty
    );

    v_total := v_total + (v_product.price * v_qty);
  end loop;

  update public.orders set total_amount = v_total, status = 'awaiting_payment' where id = v_order_id;

  return query
    select o.id, o.total_amount, o.mp_checkout_url, o.mp_order_id
    from public.orders o where o.id = v_order_id;
end;
$$;

revoke all on function public.create_checkout_order_v2(uuid, jsonb, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_checkout_order_v2(uuid, jsonb, text, text, text, text, text) to service_role;

create or replace function public.claim_order_notification(p_order_id uuid, p_kind text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  if p_kind not in ('buyer_paid','merchant_paid') then raise exception 'invalid notification kind'; end if;
  select status into v_status from public.orders where id = p_order_id;
  if v_status is distinct from 'paid' then return false; end if;

  insert into public.order_notifications (order_id, kind, status)
  values (p_order_id, p_kind, 'processing')
  on conflict (order_id, kind) do nothing;
  if found then return true; end if;

  update public.order_notifications
  set status = 'processing', last_error = null, updated_at = now()
  where order_id = p_order_id
    and kind = p_kind
    and (
      status = 'failed'
      or (status = 'processing' and updated_at < now() - interval '1 hour')
    );
  return found;
end;
$$;

create or replace function public.complete_order_notification(
  p_order_id uuid,
  p_kind text,
  p_provider_email_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.order_notifications
  set status = 'sent', provider_email_id = p_provider_email_id, last_error = null, sent_at = now(), updated_at = now()
  where order_id = p_order_id and kind = p_kind and status = 'processing';
  return found;
end;
$$;

create or replace function public.fail_order_notification(
  p_order_id uuid,
  p_kind text,
  p_error text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.order_notifications
  set status = 'failed', last_error = left(coalesce(p_error, 'email_error'), 500), updated_at = now()
  where order_id = p_order_id and kind = p_kind and status = 'processing';
  return found;
end;
$$;

revoke all on function public.claim_order_notification(uuid, text) from public, anon, authenticated;
revoke all on function public.complete_order_notification(uuid, text, text) from public, anon, authenticated;
revoke all on function public.fail_order_notification(uuid, text, text) from public, anon, authenticated;
grant execute on function public.claim_order_notification(uuid, text) to service_role;
grant execute on function public.complete_order_notification(uuid, text, text) to service_role;
grant execute on function public.fail_order_notification(uuid, text, text) to service_role;

commit;
