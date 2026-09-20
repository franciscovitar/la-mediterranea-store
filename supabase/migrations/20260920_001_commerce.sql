begin;

create table if not exists public.products (
  id text primary key,
  category text not null,
  name text not null,
  price numeric(12,2) not null check (price >= 0),
  description text not null default '',
  image text not null,
  note text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_colors (
  product_id text not null references public.products(id) on delete cascade,
  key text not null,
  label text not null,
  swatch text not null,
  image text not null,
  sort_order integer not null default 0,
  primary key (product_id, key)
);

create table if not exists public.product_sizes (
  product_id text not null references public.products(id) on delete cascade,
  size text not null,
  sort_order integer not null default 0,
  primary key (product_id, size)
);

create table if not exists public.inventory (
  product_id text not null references public.products(id) on delete cascade,
  color_key text not null default '',
  size text not null default '',
  stock integer not null check (stock >= 0),
  updated_at timestamptz not null default now(),
  primary key (product_id, color_key, size)
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  checkout_request_id uuid not null unique,
  status text not null default 'awaiting_payment'
    check (status in ('awaiting_payment','payment_pending','paid','payment_failed','checkout_error','payment_review','refunded','partially_refunded')),
  buyer_email text,
  currency text not null default 'ARS',
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  mp_order_id text unique,
  mp_checkout_url text,
  provider_status text,
  provider_status_detail text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null,
  product_name text not null,
  color_key text,
  color_label text,
  size text,
  quantity integer not null check (quantity > 0 and quantity <= 99),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  line_total numeric(12,2) not null check (line_total >= 0)
);

create table if not exists public.payment_events (
  provider_event_id text primary key,
  provider_order_id text not null,
  order_id uuid references public.orders(id) on delete set null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists inventory_set_updated_at on public.inventory;
create trigger inventory_set_updated_at before update on public.inventory
for each row execute function public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users a
    where a.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.products enable row level security;
alter table public.product_colors enable row level security;
alter table public.product_sizes enable row level security;
alter table public.inventory enable row level security;
alter table public.admin_users enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_events enable row level security;

revoke all on table public.products, public.product_colors, public.product_sizes, public.inventory, public.admin_users, public.orders, public.order_items, public.payment_events from anon, authenticated;

grant select on table public.products, public.product_colors, public.product_sizes to anon, authenticated;
grant insert, update, delete on table public.products, public.product_colors, public.product_sizes to authenticated;
grant select, insert, update, delete on table public.inventory, public.admin_users, public.orders, public.order_items, public.payment_events to authenticated;

create policy "public can read active products"
on public.products for select to anon, authenticated
using (active);

create policy "public can read colors for active products"
on public.product_colors for select to anon, authenticated
using (exists (select 1 from public.products p where p.id = product_id and p.active));

create policy "public can read sizes for active products"
on public.product_sizes for select to anon, authenticated
using (exists (select 1 from public.products p where p.id = product_id and p.active));

create policy "admins manage products"
on public.products for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "admins manage colors"
on public.product_colors for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "admins manage sizes"
on public.product_sizes for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "admins manage inventory"
on public.inventory for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "admins read themselves"
on public.admin_users for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "admins manage admin users"
on public.admin_users for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "admins manage orders"
on public.orders for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "admins manage order items"
on public.order_items for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "admins manage payment events"
on public.payment_events for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create or replace function public.create_checkout_order(
  p_request_id uuid,
  p_items jsonb,
  p_buyer_email text default null
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
begin
  if p_request_id is null then
    raise exception 'checkout request id is required';
  end if;

  return query
    select o.id, o.total_amount, o.mp_checkout_url, o.mp_order_id
    from public.orders o
    where o.checkout_request_id = p_request_id;
  if found then
    return;
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'cart is empty';
  end if;

  insert into public.orders (checkout_request_id, buyer_email)
  values (p_request_id, nullif(lower(trim(p_buyer_email)), ''))
  returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity')::integer;
    if v_qty < 1 or v_qty > 99 then
      raise exception 'invalid quantity';
    end if;

    select * into v_product
    from public.products
    where id = v_item->>'productId' and active
    for share;
    if not found then
      raise exception 'product not available: %', v_item->>'productId';
    end if;

    v_color_key := nullif(v_item->>'colorKey', '');
    v_color_label := null;
    if exists (select 1 from public.product_colors c where c.product_id = v_product.id) then
      select c.label into v_color_label
      from public.product_colors c
      where c.product_id = v_product.id and c.key = v_color_key;
      if not found then
        raise exception 'invalid color for product %', v_product.id;
      end if;
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
    if found and v_stock < v_qty then
      raise exception 'insufficient stock for product %', v_product.id;
    end if;

    insert into public.order_items (
      order_id, product_id, product_name, color_key, color_label, size,
      quantity, unit_price, line_total
    ) values (
      v_order_id, v_product.id, v_product.name, v_color_key, v_color_label, v_size,
      v_qty, v_product.price, v_product.price * v_qty
    );

    v_total := v_total + (v_product.price * v_qty);
  end loop;

  update public.orders
  set total_amount = v_total, status = 'awaiting_payment'
  where id = v_order_id;

  return query
    select o.id, o.total_amount, o.mp_checkout_url, o.mp_order_id
    from public.orders o
    where o.id = v_order_id;
end;
$$;

revoke all on function public.create_checkout_order(uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.create_checkout_order(uuid, jsonb, text) to service_role;

create or replace function public.apply_mercadopago_order_event(
  p_event_id text,
  p_mp_order_id text,
  p_external_reference uuid,
  p_status text,
  p_status_detail text,
  p_total_paid numeric,
  p_payload jsonb
)
returns text
language plpgsql
as $$
declare
  v_current_status text;
  v_total numeric(12,2);
  v_new_status text;
  v_item record;
  v_stock integer;
begin
  insert into public.payment_events (
    provider_event_id, provider_order_id, order_id, payload
  ) values (
    p_event_id, p_mp_order_id, p_external_reference, p_payload
  )
  on conflict (provider_event_id) do nothing;

  if not found then
    select status into v_current_status from public.orders where id = p_external_reference;
    return coalesce(v_current_status, 'duplicate');
  end if;

  select status, total_amount
  into v_current_status, v_total
  from public.orders
  where id = p_external_reference
  for update;

  if not found then
    raise exception 'local order not found';
  end if;

  v_new_status := v_current_status;

  if p_status = 'processed' and p_status_detail = 'accredited' then
    if p_total_paid is null or p_total_paid <> v_total then
      v_new_status := 'payment_review';
    elsif v_current_status <> 'paid' then
      for v_item in
        select product_id, color_key, size, quantity
        from public.order_items
        where order_id = p_external_reference
      loop
        select stock into v_stock
        from public.inventory
        where product_id = v_item.product_id
          and color_key = coalesce(v_item.color_key, '')
          and size = coalesce(v_item.size, '');

        if found and v_stock < v_item.quantity then
          v_new_status := 'payment_review';
          exit;
        end if;
      end loop;

      if v_new_status <> 'payment_review' then
        for v_item in
          select product_id, color_key, size, quantity
          from public.order_items
          where order_id = p_external_reference
        loop
          update public.inventory
          set stock = stock - v_item.quantity
          where product_id = v_item.product_id
            and color_key = coalesce(v_item.color_key, '')
            and size = coalesce(v_item.size, '');
        end loop;
        v_new_status := 'paid';
      end if;
    end if;
  elsif p_status = 'processed' and p_status_detail = 'refunded' then
    v_new_status := 'refunded';
  elsif p_status = 'processed' and p_status_detail = 'partially_refunded' then
    v_new_status := 'partially_refunded';
  elsif p_status in ('failed', 'canceled') and v_current_status not in ('paid','refunded','partially_refunded') then
    v_new_status := 'payment_failed';
  elsif p_status in ('created', 'action_required') and v_current_status not in ('paid','refunded','partially_refunded') then
    v_new_status := 'payment_pending';
  end if;

  update public.orders
  set
    mp_order_id = coalesce(mp_order_id, p_mp_order_id),
    status = v_new_status,
    provider_status = p_status,
    provider_status_detail = p_status_detail
  where id = p_external_reference;

  update public.payment_events
  set processed_at = now()
  where provider_event_id = p_event_id;

  return v_new_status;
end;
$$;

revoke all on function public.apply_mercadopago_order_event(text, text, uuid, text, text, numeric, jsonb) from public, anon, authenticated;
grant execute on function public.apply_mercadopago_order_event(text, text, uuid, text, text, numeric, jsonb) to service_role;

commit;
