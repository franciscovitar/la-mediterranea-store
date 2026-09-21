begin;

-- Keep trigger and service-only functions deterministic even if a caller changes search_path.
alter function public.set_updated_at() set search_path = pg_catalog, public;
alter function public.create_checkout_order(uuid, jsonb, text) set search_path = pg_catalog, public;
alter function public.apply_mercadopago_order_event(text, text, uuid, text, text, numeric, jsonb) set search_path = pg_catalog, public;

-- The helper is used inside RLS policies only; it is not an anonymous RPC endpoint.
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- One SELECT policy per role/action avoids layering public and admin SELECT policies.
drop policy if exists "public can read active products" on public.products;
drop policy if exists "admins manage products" on public.products;
create policy "catalog readers and admins select products"
on public.products for select to anon, authenticated
using (active or (select public.is_admin()));
create policy "admins insert products" on public.products for insert to authenticated
with check ((select public.is_admin()));
create policy "admins update products" on public.products for update to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete products" on public.products for delete to authenticated
using ((select public.is_admin()));

drop policy if exists "public can read colors for active products" on public.product_colors;
drop policy if exists "admins manage colors" on public.product_colors;
create policy "catalog readers and admins select colors"
on public.product_colors for select to anon, authenticated
using ((select public.is_admin()) or exists (select 1 from public.products p where p.id = product_id and p.active));
create policy "admins insert colors" on public.product_colors for insert to authenticated
with check ((select public.is_admin()));
create policy "admins update colors" on public.product_colors for update to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete colors" on public.product_colors for delete to authenticated
using ((select public.is_admin()));

drop policy if exists "public can read sizes for active products" on public.product_sizes;
drop policy if exists "admins manage sizes" on public.product_sizes;
create policy "catalog readers and admins select sizes"
on public.product_sizes for select to anon, authenticated
using ((select public.is_admin()) or exists (select 1 from public.products p where p.id = product_id and p.active));
create policy "admins insert sizes" on public.product_sizes for insert to authenticated
with check ((select public.is_admin()));
create policy "admins update sizes" on public.product_sizes for update to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete sizes" on public.product_sizes for delete to authenticated
using ((select public.is_admin()));

drop policy if exists "admins manage admin users" on public.admin_users;
create policy "admins insert admin users" on public.admin_users for insert to authenticated
with check ((select public.is_admin()));
create policy "admins update admin users" on public.admin_users for update to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete admin users" on public.admin_users for delete to authenticated
using ((select public.is_admin()));

commit;
