-- CAUCE-ONLY Supabase project. DO NOT run in the original La Mediterránea DB.
-- Source snapshot applied on 2026-11-21 as migration
-- 20261121132236 cauce_m2_isolated_merchant_schema in erswrerhpmvviedudzit.
-- Apply HARDEN_M2_20261121.sql afterward: its explicit role REVOKEs are vital.
-- The filename retains DRAFT to preserve references to the original review.
begin;

create table public.cauce_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.cauce_products (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category text not null check (char_length(category) between 2 and 60),
  name text not null check (char_length(name) between 2 and 120),
  price integer not null check (price between 0 and 100000000),
  description text not null check (char_length(description) <= 1000),
  image text not null check (image ~ '^/cauce/[a-z0-9-]+\.webp$'),
  material text not null default '',
  dimensions text not null default '',
  care text not null default '',
  badge text,
  featured boolean not null default false,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cauce_id_matches_slug check (id = slug)
);

create table public.cauce_inventory (
  product_id text primary key references public.cauce_products(id) on delete restrict,
  stock integer not null default 0 check (stock between 0 and 1000000),
  version integer not null default 0 check (version >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table public.cauce_inventory_movements (
  id bigint generated always as identity primary key,
  product_id text not null references public.cauce_products(id) on delete restrict,
  actor_id uuid not null references auth.users(id),
  previous_stock integer not null,
  new_stock integer not null,
  version integer not null,
  reason text not null check (char_length(reason) between 3 and 200),
  happened_at timestamptz not null default now(),
  unique (product_id, version)
);

-- Reserved for M3 test checkout. No public insert, guest email, or fake orders.
create table public.cauce_orders (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending','paid_test','cancelled','failed_test')),
  total_amount integer not null check (total_amount >= 0),
  created_at timestamptz not null default now()
);

create index cauce_active_category_idx on public.cauce_products(category, name) where active;
create index cauce_featured_idx on public.cauce_products(name) where active and featured;
create index cauce_product_created_idx on public.cauce_products(created_at desc);
create index cauce_movements_recent_idx on public.cauce_inventory_movements(happened_at desc);
create index cauce_orders_recent_idx on public.cauce_orders(created_at desc);

create function public.cauce_product_defaults()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.cauce_inventory(product_id) values (new.id);
  return new;
end;
$$;
create trigger cauce_create_inventory after insert on public.cauce_products
for each row execute function public.cauce_product_defaults();
revoke all on function public.cauce_product_defaults() from public;

create function public.cauce_touch_product()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger cauce_update_product_timestamp before update on public.cauce_products
for each row execute function public.cauce_touch_product();
revoke all on function public.cauce_touch_product() from public;

create function public.cauce_set_stock(
  p_product_id text,
  p_expected_version integer,
  p_stock integer,
  p_reason text
) returns table(stock integer, version integer)
language plpgsql security definer set search_path = ''
as $$
declare
  before_row public.cauce_inventory%rowtype;
  after_row public.cauce_inventory%rowtype;
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.cauce_staff s where s.user_id = (select auth.uid())
  ) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_stock < 0 or p_stock > 1000000 or p_stock is null
    or p_expected_version < 0 or p_expected_version is null
    or char_length(trim(coalesce(p_reason, ''))) not between 3 and 200 then
    raise exception 'Invalid stock adjustment' using errcode = '22023';
  end if;
  select * into before_row from public.cauce_inventory
    where product_id = p_product_id for update;
  if not found then raise exception 'Product not found' using errcode = 'P0002'; end if;
  if before_row.version <> p_expected_version then
    raise exception 'Stock has changed, reload before editing' using errcode = '40001';
  end if;
  update public.cauce_inventory i
  set stock = p_stock, version = before_row.version + 1,
      updated_at = now(), updated_by = (select auth.uid())
  where i.product_id = p_product_id
  returning * into after_row;
  if not found then raise exception 'Not authorized' using errcode = '42501'; end if;
  insert into public.cauce_inventory_movements
    (product_id,actor_id,previous_stock,new_stock,version,reason)
  values (p_product_id,(select auth.uid()),before_row.stock,after_row.stock,after_row.version,trim(p_reason));
  return query select after_row.stock, after_row.version;
end;
$$;
revoke all on function public.cauce_set_stock(text,integer,integer,text) from public;
grant execute on function public.cauce_set_stock(text,integer,integer,text) to authenticated;

alter table public.cauce_staff enable row level security;
alter table public.cauce_products enable row level security;
alter table public.cauce_inventory enable row level security;
alter table public.cauce_inventory_movements enable row level security;
alter table public.cauce_orders enable row level security;

revoke all on public.cauce_staff, public.cauce_products, public.cauce_inventory,
  public.cauce_inventory_movements, public.cauce_orders from anon, authenticated;
grant select on public.cauce_products, public.cauce_inventory to anon, authenticated;
grant insert, update on public.cauce_products to authenticated;
-- Only the tightly scoped SECURITY DEFINER RPC may change stock or its ledger.
-- Its first operation validates staff membership, independently of JWT metadata.
grant select on public.cauce_staff, public.cauce_orders to authenticated;
-- The merchant console needs read-only ledger access. RLS limits rows to staff;
-- anon remains without any privilege on movement history.
grant select on public.cauce_inventory_movements to authenticated;

create policy cauce_staff_self on public.cauce_staff for select to authenticated
using (user_id = (select auth.uid()));

create policy cauce_visible_products on public.cauce_products for select to anon, authenticated
using (active);
create policy cauce_staff_products_read on public.cauce_products for select to authenticated
using (exists (select 1 from public.cauce_staff s where s.user_id = (select auth.uid())));
create policy cauce_staff_products_insert on public.cauce_products for insert to authenticated
with check (exists (select 1 from public.cauce_staff s where s.user_id = (select auth.uid())));
create policy cauce_staff_products_update on public.cauce_products for update to authenticated
using (exists (select 1 from public.cauce_staff s where s.user_id = (select auth.uid())))
with check (exists (select 1 from public.cauce_staff s where s.user_id = (select auth.uid())));

create policy cauce_public_stock on public.cauce_inventory for select to anon, authenticated
using (exists (select 1 from public.cauce_products p where p.id = product_id and p.active));
create policy cauce_staff_stock_read on public.cauce_inventory for select to authenticated
using (exists (select 1 from public.cauce_staff s where s.user_id = (select auth.uid())));
create policy cauce_staff_stock_insert on public.cauce_inventory for insert to authenticated
with check (exists (select 1 from public.cauce_staff s where s.user_id = (select auth.uid())));
create policy cauce_staff_stock_update on public.cauce_inventory for update to authenticated
using (exists (select 1 from public.cauce_staff s where s.user_id = (select auth.uid())))
with check (exists (select 1 from public.cauce_staff s where s.user_id = (select auth.uid())));

create policy cauce_staff_movements_read on public.cauce_inventory_movements for select to authenticated
using (exists (select 1 from public.cauce_staff s where s.user_id = (select auth.uid())));
create policy cauce_staff_movements_insert on public.cauce_inventory_movements for insert to authenticated
with check (actor_id = (select auth.uid())
  and exists (select 1 from public.cauce_staff s where s.user_id = (select auth.uid())));
create policy cauce_staff_orders_read on public.cauce_orders for select to authenticated
using (exists (select 1 from public.cauce_staff s where s.user_id = (select auth.uid())));

commit;
