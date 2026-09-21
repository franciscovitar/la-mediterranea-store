begin;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users a
    where a.user_id = (select auth.uid())
  );
$$;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

-- Anon never needs the private helper; authenticated readers can additionally be admins.
drop policy if exists "catalog readers and admins select products" on public.products;
create policy "anon reads active products" on public.products for select to anon using (active);
create policy "authenticated reads active or admin products" on public.products for select to authenticated using (active or (select private.is_admin()));
alter policy "admins insert products" on public.products with check ((select private.is_admin()));
alter policy "admins update products" on public.products using ((select private.is_admin())) with check ((select private.is_admin()));
alter policy "admins delete products" on public.products using ((select private.is_admin()));

drop policy if exists "catalog readers and admins select colors" on public.product_colors;
create policy "anon reads active product colors" on public.product_colors for select to anon using (exists (select 1 from public.products p where p.id = product_id and p.active));
create policy "authenticated reads active or admin colors" on public.product_colors for select to authenticated using ((select private.is_admin()) or exists (select 1 from public.products p where p.id = product_id and p.active));
alter policy "admins insert colors" on public.product_colors with check ((select private.is_admin()));
alter policy "admins update colors" on public.product_colors using ((select private.is_admin())) with check ((select private.is_admin()));
alter policy "admins delete colors" on public.product_colors using ((select private.is_admin()));

drop policy if exists "catalog readers and admins select sizes" on public.product_sizes;
create policy "anon reads active product sizes" on public.product_sizes for select to anon using (exists (select 1 from public.products p where p.id = product_id and p.active));
create policy "authenticated reads active or admin sizes" on public.product_sizes for select to authenticated using ((select private.is_admin()) or exists (select 1 from public.products p where p.id = product_id and p.active));
alter policy "admins insert sizes" on public.product_sizes with check ((select private.is_admin()));
alter policy "admins update sizes" on public.product_sizes using ((select private.is_admin())) with check ((select private.is_admin()));
alter policy "admins delete sizes" on public.product_sizes using ((select private.is_admin()));

alter policy "admins manage inventory" on public.inventory using ((select private.is_admin())) with check ((select private.is_admin()));
alter policy "admins read themselves" on public.admin_users using (user_id = (select auth.uid()) or (select private.is_admin()));
alter policy "admins insert admin users" on public.admin_users with check ((select private.is_admin()));
alter policy "admins update admin users" on public.admin_users using ((select private.is_admin())) with check ((select private.is_admin()));
alter policy "admins delete admin users" on public.admin_users using ((select private.is_admin()));
alter policy "admins manage orders" on public.orders using ((select private.is_admin())) with check ((select private.is_admin()));
alter policy "admins manage order items" on public.order_items using ((select private.is_admin())) with check ((select private.is_admin()));
alter policy "admins manage payment events" on public.payment_events using ((select private.is_admin())) with check ((select private.is_admin()));
alter policy "admins upload product images" on storage.objects with check (bucket_id = 'product-images' and (select private.is_admin()));
alter policy "admins update product images" on storage.objects using (bucket_id = 'product-images' and (select private.is_admin())) with check (bucket_id = 'product-images' and (select private.is_admin()));
alter policy "admins delete product images" on storage.objects using (bucket_id = 'product-images' and (select private.is_admin()));

drop function public.is_admin();

commit;
