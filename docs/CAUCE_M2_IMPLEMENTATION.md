# Cauce M2 — merchant operations, isolated database boundary

**Checkpoint (2026-11-21, updated after staging QA):** isolated Supabase database **CREATED / MIGRATED / SEEDED** and the Next.js public storefront **DEPLOYED to non-production staging**, reading Cauce data through Supabase RLS. Read-only API comparison, desktop/mobile browser walkthrough, unit tests and build have passed. **Real staff Auth, merchant writes/concurrency and transaction flows are NOT verified or enabled.** This is not a production rollout or payment certification.

## Product capabilities added in code

- Dedicated /gestion with staff-only magic-link authentication, catalog maintenance (new/edit, publish/hide, featured), per-product stock adjustments with reason/version, movement history and stock-low indicators, and a read-only order tab. Product images are currently selected from 12 already bundled Cauce assets; no uploads yet.
- Cauce-only server operations under /api/cauce/merchant/* with authenticated role guard, JSON/Origin validation and no-store responses. An unconfigured console returns 404/503; the old /admin stays blocked. No real client records or payment routes are used.
- Public shop now accepts a server-read catalog from an isolated Supabase project; updates to active products and stock become visible on a fresh request when enabled. Product details support newly added slugs and products with zero stock cannot be added. Without explicit database activation, M1's 12 fictional products remain the public source.
- supabase/cauce/SCHEMA_M2_DRAFT.sql defines independent catalog, staff, stock, immutable stock-movement events and a read-only order shell. RLS limits shoppers to active product/stock reads; writes require staff. cauce_set_stock uses a row lock, expected version, bounded new stock, actor check and same-transaction ledger insert. Follow-up HARDEN_M2_20261121.sql explicitly revokes EXECUTE from anon/authenticated on trigger functions and from anon on the stock RPC; the authenticated RPC checks staff membership itself.
- supabase/cauce/SEED_M2_DRAFT.sql contains only fictional products and deterministic fictional stock values; nothing imported from the original store.

## Isolated Supabase activation — observed evidence

- Created project **cauce-commerce-lab** (ref `erswrerhpmvviedudzit`) in an approved Free-plan organization, region `sa-east-1`, project creation quote **USD 0/month** at the time of creation. Historical La Mediterránea ref `urmbjxmijtwovkzmvoav` remained separate and untouched. The quote is not a guarantee against future plan changes or usage-based charges.
- Applied schema migration **`20261121132236 cauce_m2_isolated_merchant_schema`** and hardening migration **`20261121132435 cauce_m2_harden_rpc_and_fk_indexes`** via the Supabase integration. Both were confirmed in migration readback. The hardening includes explicit function role revokes and two foreign-key indexes.
- Seeded the new DB from the fictional `SEED_M2_DRAFT.sql` after fixing `featured` null values to `false`: **12 products, 12 inventory records, 4 featured, 154 total fictional units, 0 movement events**. All 12 are currently published. No real orders, users or customers were imported.
- Observed all **five Cauce tables with RLS on**. An `anon` role saw 12 active products; hiding one product inside a rolled-back transaction reduced public visible inventory to 11; readback after rollback showed 12 published again. `anon` has no INSERT on catalog, no UPDATE stock, no INSERT ledger or orders; authenticated nonstaff cannot call stock successfully (SQLSTATE 42501 caught in an isolated negative test). No stock event was written.
- Function privileges readback: `cauce_product_defaults` and `cauce_touch_product` are non-executable by `anon` and `authenticated`; `cauce_set_stock` is executable only by `authenticated` and performs its own staff membership check. The remaining Supabase security linter **warning is intentional**: authenticated clients can invoke this SECURITY DEFINER RPC, but only rows in `cauce_staff` are authorized. The linter cannot establish the function-level check. See [Supabase linter 0029](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- Supabase performance advisor reports two overlapping permissive read policies and indexes as unused immediately after creation. No performance at realistic load was tested. No action was taken solely to silence unused-index warnings on a new database.

## Remaining environment and rollout gates

1. **DONE:** independent Cauce project provisioned and both migrations applied with readback. The initial SQL and follow-up hardening remain versioned in source for review; CLI was not available, so Supabase migration API was used.
2. Configure Auth email and allowlisted callback at https://YOUR-CAUCE-HOST/auth/cauce/confirm; create a dedicated staff test user, then bootstrap its **verified Auth UUID** into public.cauce_staff using the authorized project admin only. Never grant staff to an arbitrary email or allow registration to create operators automatically. **Not done.**
3. **DONE for public catalog:** four Preview-only variables configured on the separate Vercel project `cauce-retail-preview`: `NEXT_PUBLIC_CAUCE_SUPABASE_URL`, `NEXT_PUBLIC_CAUCE_SUPABASE_PUBLISHABLE_KEY`, `CAUCE_CATALOG_SOURCE=database`, `CAUCE_MERCHANT_ENABLED=false`. No service-role key is used; Production env values remain unset. The old `cauce-commerce-showcase` remains the technical simulator and is not repurposed. **Still pending:** after an authorized staff test login, deliberately enable `CAUCE_MERCHANT_ENABLED=true` on non-production and redeploy.
4. **DONE:** deployed the storefront from feature commit `f91f1ef5235db9f8f4f16b328aa441c822f0cee3` to [Vercel non-production staging](https://cauce-retail-preview-5pegfjov7-genova.vercel.app/catalogo); deployment `dpl_B4WoiuJymqe6dWAbZepzvevmasdm` was `READY`. Browser inspection passed for navigation, catalog, filters, search, wishlists, local cart and product detail. A mobile horizontal-overflow defect was fixed on the feature branch and verified at 375px document width (375px scroll width). Public API returned the same 12 active products, 4 featured and 154 units as a direct isolated Supabase query. `/gestion` remains 404; merchant GET returned 503 and unauthorized POST routes have no public write UI. The checkout page shows unavailable/coming soon.
5. **PENDING:** authorize and configure test-user email callback, verify Auth UUID, bootstrap one staff membership, activate non-production merchant feature, then test real merchant CRUD, stale-version/conflict and concurrent stock writes. Production, payments and protected-branch merge require separate authorization.

## Preview deployment and guardrails — observed

- Dedicated Vercel project: `cauce-retail-preview` (`prj_vVT62K5wCcxENDLHymPH6Q9wPOpD`), framework Next.js 15, Node 22, no connected Git auto-deployment. Existing showcase project and historical storefront project were not reconfigured. `main` was not modified.
- The first deployment requested without a target was unexpectedly classified by Vercel as Production on an empty project; it was **canceled immediately** (`dpl_326kp84rQxZsnPbgP437G4rtHEXb`, state `CANCELED`). Subsequent deployments used explicit `target=staging`; no successful Production deployment occurred.
- Supabase security advisor still reports `authenticated_security_definer_function_executable` for `cauce_set_stock`; function definition inspected and it checks `auth.uid()` and `cauce_staff` membership before writing. This warning is documented, not suppressed. Performance advisor notes unused indexes on an almost empty DB and overlapping read policies; these remain for future query-plan review.
- No real clients, payment credentials or service-role keys were configured; no historical Supabase or production data was written.

## Security contract / real QA still pending

| Case | Code or SQL guard | Current evidence |
| --- | --- | --- |
| Cauce points to historical Supabase URL | Reject identical URLs in config | Local unit test PASS |
| Invalid product IDs, remote image, prices | Strict server payload validator + SQL checks | Local unit test PASS |
| Forged cross-origin JSON mutation | Same-origin and JSON checks | Local unit test PASS |
| Guest/nonstaff catalog or inventory write | Server claim+membership check + table RLS | Anonymous privileges checked; nonstaff stock RPC denied via 42501; Preview merchant GET 503 while disabled; real unauthorized POST tests pending |
| Concurrent stock updates | Row lock, expected version, conflict, atomic ledger | Applied schema and source reviewed; concurrency DB test **NOT RUN** |
| Browser public availability | Real catalog read under public RLS | **PASS:** HTTP 200 `/`, `/catalogo`, `/api/catalog`; DB/API aggregate and names match; Chrome desktop/mobile checks PASS, with overflow corrected |
| Staff OTP, callback and session refresh | SSR cookie client + verified claims + staff table | Build PASS; actual email Auth **NOT RUN** |
| Orders / checkout / money movement | Checkout remains blocked; order tab read-only | Historical endpoints blocked in local HTTP smoke |

**Important:** cauce_inventory is one simple stock row per product, not the historic color/size variant inventory. That is an intentional current Cauce product choice, not an assertion that all retail variants are already modeled. Prices are integer ARS for fictional products. Guest checkout, durable test orders, payment provider, fulfillment and returns remain M3/M4.

## Research and design note

We reuse Next.js 15 + React 19 + pinned @supabase/ssr and supabase-js, keeping the original payment adapter disabled. Alternatives considered: rewrite with Shopify (commercially sensible for ordinary merchants but not a fit for a custom engineering evidence project), extend the historical La Mediterránea database (rejected: provenance/client-data isolation), and purely browser-local simulation (rejected: cannot demonstrate real authorization, RLS or transactional stock). Official Supabase [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [SSR Auth](https://supabase.com/docs/guides/auth/server-side) and [changelog](https://supabase.com/changelog.md) were checked 2026-11-21. The 2026-11-16 breaking change to merging Supabase branches requires production-branch write scope; no branch merges are performed here.

**Implementation boundary:** The isolated staging storefront now uses the real database-backed synthetic catalog. **M2 is partly operational, not complete**: there is no verified staff session or authorized merchant write, and no stock concurrency test. Payments and public production remain disabled. The staging URL uses the team's existing Vercel deployment protection; it is not yet a freely accessible recruiter-facing production domain.
