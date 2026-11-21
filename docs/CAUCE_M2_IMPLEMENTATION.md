# Cauce M2 — merchant operations, isolated database boundary

**Checkpoint:** source implemented and locally built/tested on 2026-11-21; **database DRAFT / NOT_APPLIED / NOT_INTEGRATION_TESTED**. This file does not certify a live admin, real stock synchronization, transactional orders, or Vercel release.

## Product capabilities added in code

- Dedicated /gestion with staff-only magic-link authentication, catalog maintenance (new/edit, publish/hide, featured), per-product stock adjustments with reason/version, movement history and stock-low indicators, and a read-only order tab. Product images are currently selected from 12 already bundled Cauce assets; no uploads yet.
- Cauce-only server operations under /api/cauce/merchant/* with authenticated role guard, JSON/Origin validation and no-store responses. An unconfigured console returns 404/503; the old /admin stays blocked. No real client records or payment routes are used.
- Public shop now accepts a server-read catalog from an isolated Supabase project; updates to active products and stock become visible on a fresh request when enabled. Product details support newly added slugs and products with zero stock cannot be added. Without explicit database activation, M1's 12 fictional products remain the public source.
- supabase/cauce/SCHEMA_M2_DRAFT.sql defines independent catalog, staff, stock, immutable stock-movement events and a read-only order shell. RLS limits shoppers to active product/stock reads; writes require staff. cauce_set_stock uses a row lock, expected version, bounded new stock, actor check and same-transaction ledger insert. The definer RPC revokes PUBLIC execute and checks membership itself.
- supabase/cauce/SEED_M2_DRAFT.sql contains only fictional products and deterministic fictional stock values; nothing imported from the original store.

## Environment and rollout gates

1. Create or explicitly approve an **independent Supabase project** for fictional Cauce (no customer data). Confirm its project ref differs from the historic URL and review resource/cost implications first. No project has been created by this checkpoint.
2. Review the SQL with a database expert/SQL checker and migrate it through the installed Supabase CLI (supabase migration new and proper migration lifecycle) in the **isolated project only**. The CLI was not available in the current workspace; the SQL is an unapplied source draft. Apply seed separately after schema QA. Never apply it to the old production instance.
3. Configure Auth email and allowlisted callback at https://YOUR-CAUCE-HOST/auth/cauce/confirm; create a dedicated staff test user, then bootstrap its **verified Auth UUID** into public.cauce_staff using the authorized project admin only. Never grant staff to an arbitrary email or allow registration to create operators automatically.
4. Configure only NEXT_PUBLIC_CAUCE_SUPABASE_URL and NEXT_PUBLIC_CAUCE_SUPABASE_PUBLISHABLE_KEY from that independent project. The implementation uses no service-role client key. Switch CAUCE_CATALOG_SOURCE=database and CAUCE_MERCHANT_ENABLED=true in isolated preview/test, after auth/RLS tests pass.
5. Run actual DB tests as anon, authenticated nonstaff, staff, replay/stale-version and concurrent stock writer. Confirm negative CRUD cases, empty stock, product hiding, SEO and public readback. Test Auth PKCE link on the configured host, browser responsive/keyboard interactions, then release separately with permission and rollback plan.

## Security contract / real QA still pending

| Case | Code or SQL guard | Current evidence |
| --- | --- | --- |
| Cauce points to historical Supabase URL | Reject identical URLs in config | Local unit test PASS |
| Invalid product IDs, remote image, prices | Strict server payload validator + SQL checks | Local unit test PASS |
| Forged cross-origin JSON mutation | Same-origin and JSON checks | Local unit test PASS |
| Guest/nonstaff catalog or inventory write | Server claim+membership check + table RLS | Source inspected; real DB test **NOT RUN** |
| Concurrent stock updates | Row lock, expected version, conflict, atomic ledger | SQL draft reviewed in source; concurrency DB test **NOT RUN** |
| Browser public availability | Real catalog read under public RLS | Code built; DB readback **NOT RUN** |
| Staff OTP, callback and session refresh | SSR cookie client + verified claims + staff table | Build PASS; actual email Auth **NOT RUN** |
| Orders / checkout / money movement | Checkout remains blocked; order tab read-only | Historical endpoints blocked in local HTTP smoke |

**Important:** cauce_inventory is one simple stock row per product, not the historic color/size variant inventory. That is an intentional current Cauce product choice, not an assertion that all retail variants are already modeled. Prices are integer ARS for fictional products. Guest checkout, durable test orders, payment provider, fulfillment and returns remain M3/M4.

## Research and design note

We reuse Next.js 15 + React 19 + pinned @supabase/ssr and supabase-js, keeping the original payment adapter disabled. Alternatives considered: rewrite with Shopify (commercially sensible for ordinary merchants but not a fit for a custom engineering evidence project), extend the historical La Mediterránea database (rejected: provenance/client-data isolation), and purely browser-local simulation (rejected: cannot demonstrate real authorization, RLS or transactional stock). Official Supabase [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [SSR Auth](https://supabase.com/docs/guides/auth/server-side) and [changelog](https://supabase.com/changelog.md) were checked 2026-11-21. The 2026-11-16 breaking change to merging Supabase branches requires production-branch write scope; no branch merges are performed here.

**Implementation boundary:** This PR is an M2 code checkpoint, not M2 fully operational. M2 becomes integration-tested only after isolated DB/auth setup, real RLS and concurrency tests, live readback, and browser QA.
