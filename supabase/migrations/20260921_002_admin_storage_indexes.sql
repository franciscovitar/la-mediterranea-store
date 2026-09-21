begin;

-- These indexes cover the public catalog, the administrative listing and order detail.
create index if not exists products_active_category_idx on public.products (active, category);
create index if not exists product_colors_product_sort_idx on public.product_colors (product_id, sort_order);
create index if not exists product_sizes_product_sort_idx on public.product_sizes (product_id, sort_order);
create index if not exists inventory_product_variant_idx on public.inventory (product_id, color_key, size);
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists payment_events_order_id_idx on public.payment_events (order_id);

-- Trigger helpers and checkout RPCs are internal database entry points, never public APIs.
revoke all on function public.set_updated_at() from public, anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public reads product images" on storage.objects;
drop policy if exists "admins upload product images" on storage.objects;
drop policy if exists "admins update product images" on storage.objects;
drop policy if exists "admins delete product images" on storage.objects;

create policy "public reads product images"
on storage.objects for select to public
using (bucket_id = 'product-images');

create policy "admins upload product images"
on storage.objects for insert to authenticated
with check (bucket_id = 'product-images' and (select public.is_admin()));

create policy "admins update product images"
on storage.objects for update to authenticated
using (bucket_id = 'product-images' and (select public.is_admin()))
with check (bucket_id = 'product-images' and (select public.is_admin()));

create policy "admins delete product images"
on storage.objects for delete to authenticated
using (bucket_id = 'product-images' and (select public.is_admin()));

commit;
