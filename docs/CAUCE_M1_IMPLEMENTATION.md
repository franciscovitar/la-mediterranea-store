# Cauce M1 — independent retail foundation

**Stage:** code implemented in a non-production feature branch, not released/cut over. 2026-11-21.

## Delivered in source

- New Cauce brand language (responsive homepage, product grid, product detail, footer, favicons) with coherent original editorial visuals, **not** the La Mediterránea customer identity.
- 12 fictitious houseware SKU records under `data/cauce-products.json` with dedicated generated/optimized WebP assets under `public/cauce/`. The image set is generated concept photography, **not real photographed inventory**. Prices, descriptions, measurements and availability are fictional.
- `/catalogo`: accent-insensitive search across name/category/material, category selection, four sorts, shareable query string, empty states. Homepage linked collections.
- `/producto/[slug]`: individually indexable static routes, semantic metadata, materials, care, dimensions, quantity selection and related items.
- `/favoritos`: persisted browser wishlist; shared cart state across routes, restored through existing `reconcileCart` against canonical Cauce fixture, capped quantity and accessible reused cart drawer.
- `/api/catalog`: returns the same isolated synthetic public read model. Old Supabase catalog path and domain libraries remain in source to integrate later.
- Middleware blocks historic checkout/admin/payment/integration routes in normal operation. Historical private development opt-in explicitly requires `NODE_ENV=development` and `CAUCE_LEGACY_DEV_ACCESS=true`; never enable it in a public environment. `/checkout` serves a non-transactional unavailable state.

## Reuse and scope boundary

**Reused:** Next.js App Router/TS, `Product` type, ARS formatter, `CartDrawer`, `reconcileCart`, source CSS foundations, existing checkout/order/RLS/admin libraries and their regression tests (retained, not exposed).

**New:** Cauce product read model and public route group; dedicated image assets; independent cart and favorites browser keys, home/product/category styling.

**Not yet implemented:** isolated Cauce Supabase schema/seed and migrations, genuine stock and availability, authenticated current merchant administration, checkout/quote/order API aligned to the Cauce catalog, idempotent test provider, fulfillment/returns, audit and analytics. The current store cannot take orders.

Do not confuse static product browsing with production-grade ecommerce. Do not re-enable legacy checkout to claim a functional Cauce transaction; M2–M4 must preserve the concurrency/idempotency constraints from [ARCHITECTURE_V2.md](ARCHITECTURE_V2.md).

## Test contract

- Existing 20 backend/commerce helper tests preserved; new catalog/search/cart/asset tests added.
- `npm run typecheck`, `node --import tsx --test tests/*.test.ts`, `npm run validate:catalog` and `npm run build` are local gates. Record actual outcomes in the PR, not assumptions in this source file.
- Required browser QA before public cutover: desktop/mobile navigation, Cauce asset usage, search/filter shareability, quick-add/cross-route cart persistence, favorite persistence, quantity bounds, 404, keyboard/drawer focus, no external payment route or legacy brand leak.
- Next phases: M2 authenticated merchant back-office on isolated Cauce Postgres, M3 server-authoritative quote/test checkout with atomic stock and fingerprint idempotency, M4 fulfillment/audit/analytics, M5 production-like seed and deploy/readback.

No real payment credentials, client orders, Supabase instance or Vercel deployment were changed for M1.
