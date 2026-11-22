# Cauce Commerce Lab · Full-stack commerce engineering (historical source: La Mediterránea Store)

> **Product direction (21 Nov 2026):** Cauce is becoming a complete, company-usable fictional online store built on this actual Next.js/Supabase codebase. The browser-only `showcase/` is a historical technical simulator, **not** the target product interface. Read the [product contract](docs/PRODUCT_DIRECTION_V2.md), [proposed architecture and reuse matrix](docs/ARCHITECTURE_V2.md), and [ecommerce capability research](docs/FEATURE_RESEARCH_20261121.md).

> **M1 retail foundation — deployed to isolated staging:** The Next.js routes provide Cauce's own brand, 12 fictional homeware products with optimized photos, homepage, catalog, search, category filter, sorting, product details, persistent wishlists and local cart. The [non-production staging storefront](https://cauce-retail-preview-5pegfjov7-genova.vercel.app/catalogo) was verified against the dedicated synthetic Supabase database. See [M1](docs/CAUCE_M1_IMPLEMENTATION.md) and [M2](docs/CAUCE_M2_IMPLEMENTATION.md) for checkpoint evidence.

This repository originated as a reconstruction of a merchandising storefront for **La Mediterránea — Orquesta-Escuela Infantil y Juvenil**. That original commercial project was **not purchased or launched by the prospective customer**. It is now presented as a personal engineering case study, not a delivered customer success. Historical catalog, brand and product images remain here as provenance of that checkpoint, and are not used in the independent public showcase.

**Storefront Preview:** [Cauce Next.js retail staging](https://cauce-retail-preview-5pegfjov7-genova.vercel.app/) (Vercel team authentication may be required). **Older educational simulator:** [technical showcase](https://cauce-commerce-showcase-genova.vercel.app/) in [`showcase/`](showcase/README.md), retained for pricing, conflict, idempotency and callback demonstrations. Explanations for recruiters belong in the portfolio and repository; the storefront remains product-first.

> **M2 staging checkpoint (2026-11-21):** Supabase `cauce-commerce-lab` is isolated, migrated and seeded with 12 fictional products and 154 units. Vercel Preview variables are configured in dedicated project `cauce-retail-preview`; the public API and Chrome desktop/mobile QA confirmed database-backed catalog reads and safety gates. A mobile overflow issue was fixed on this branch. The `/gestion` staff panel remains disabled until an authorized test user and Auth redirect are verified, and concurrency/merchant-write QA is still pending. No payments, customer records, production rollout or `main` merge were enabled. See [M2 details](docs/CAUCE_M2_IMPLEMENTATION.md).

> **M3 local code checkpoint (2026-11-22):** Added an isolated `/pedido` order-review UI and `/api/cauce/checkout/*` quote, test-preference, status and signed-webhook routes. The standalone Cauce Supabase project already has reservation/payment RPCs; their source snapshot is included in the repository. All payment operations remain disabled by default and sandbox credentials are deferred. **Neither end-to-end test payment nor staging deploy of this M3 code has yet been observed.** See [M3 implementation and security gates](docs/CAUCE_M3_IMPLEMENTATION.md).

The historical storefront read its operational catalog from Supabase. Cauce uses a separate synthetic static catalog by default, with a prepared switch to read from a different isolated database after its migration and security QA. Mercado Pago remains intentionally disconnected.

## Historical backend capabilities kept for reuse

- Next.js + TypeScript storefront.
- Historical La Mediterránea catalog, RLS and admin preserved for provenance (not the Cauce public catalog).
- Responsive catalog and reusable basket/variant logic.
- Product color/size variants where defined by the current catalog.
- Persistent client-side cart with quantity controls.
- Server-authoritative checkout quote endpoint.
- Checkout UI and payment result pages.
- Supabase schema + seed applied for products, variants, stock, orders and admin authorization.
- Historical storefront read and server checkout quote, admin persistence use Supabase when explicitly enabled in private development.
- Supabase Storage serves product images with administrator-only writes.
- Magic Link authentication protects `/admin`; database RLS enforces the administrator role.
- Mercado Pago Checkout Pro Orders API adapter prepared behind environment variables.
- Signed Mercado Pago webhook endpoint prepared.
- Integration readiness endpoint and admin connection-status page.
- Admin product duplication, Supabase-backed backup/export/validated restore, and a real catalog preview with checkout disabled.
- Unit tests for server-side checkout validation and admin export helpers.
- Idempotency fingerprinting so a changed cart/email cannot accidentally reuse an older payment order.
- Basic security headers plus safe 404/error states.
- CI checks for catalog integrity, TypeScript and production build.

**Current safety:** `CAUCE_LEGACY_DEV_ACCESS=true` can opt in to historical admin/checkout routes **only in development** for authorized characterization tests. It has no effect in production; those operations remain blocked. Do not point Cauce's public frontend to legacy order/payment tables. New transaction/migration work is milestones M2–M4.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Verify

```bash
npm run check
node --test showcase/model.test.mjs
```

If `tsx --test` cannot create IPC sockets in a restricted Linux runner, `node --import tsx --test tests/*.test.ts` exercises the same project test modules without that CLI socket.

## Runtime configuration

Copy `.env.example` to `.env.local`. Do not commit credentials. Cauce has its own `NEXT_PUBLIC_CAUCE_SUPABASE_*`, `CAUCE_SUPABASE_SECRET_KEY` and `CAUCE_MERCADOPAGO_TEST_*` variables; never reuse the original merchant's Supabase or Mercado Pago credentials. Payment operations stay off until `CAUCE_CHECKOUT_ENABLED=true` and all independent test-only requirements pass.

The remaining payment/deployment gates are documented in [Integration-ready checkpoint](docs/INTEGRATION_READY.md).

## Scope and provenance

- [V1 scope](docs/SCOPE_V1.md)
- [Integration-ready checkpoint](docs/INTEGRATION_READY.md)
- [Source notes](docs/SOURCE_NOTES.md)

## Production handoff

Before launch, follow [the production handoff checklist](docs/PRODUCTION_CHECKLIST.md).

Deployment smoke endpoint: `/api/health`.

## Runtime

The repository and CI target Node.js 22.x. The public sitemap is generated from `NEXT_PUBLIC_SITE_URL` when that production URL exists.
