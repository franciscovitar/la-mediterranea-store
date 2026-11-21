-- Apply only to the isolated Cauce Supabase project (erswrerhpmvviedudzit).
-- Follow-up to cauce_m2_isolated_merchant_schema. Never run in legacy store.
begin;

-- PostgreSQL's default function EXECUTE grants are broader than table grants.
-- Trigger functions are not public RPC endpoints; only the authenticated stock
-- RPC may be invoked, and it separately checks membership in cauce_staff.
revoke execute on function public.cauce_product_defaults() from public, anon, authenticated;
revoke execute on function public.cauce_touch_product() from public, anon, authenticated;
revoke execute on function public.cauce_set_stock(text,integer,integer,text)
  from public, anon, authenticated;
grant execute on function public.cauce_set_stock(text,integer,integer,text) to authenticated;

-- Cover the foreign keys identified by the Supabase performance advisor.
create index if not exists cauce_inventory_updated_by_idx
  on public.cauce_inventory(updated_by);
create index if not exists cauce_inventory_movements_actor_idx
  on public.cauce_inventory_movements(actor_id);

commit;
