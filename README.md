# Cauce Commerce Lab · Full-stack commerce engineering (historical source: La Mediterránea Store)

> **Product direction (21 Nov 2026):** Cauce is becoming a complete, company-usable fictional online store built on this actual Next.js/Supabase codebase. The browser-only `showcase/` is a historical technical simulator, **not** the target product interface. Read the [product contract](docs/PRODUCT_DIRECTION_V2.md), [proposed architecture and reuse matrix](docs/ARCHITECTURE_V2.md), and [ecommerce capability research](docs/FEATURE_RESEARCH_20261121.md).

> **Implementation checkpoint — M1 retail foundation (not yet deployed):** The primary Next.js routes now contain Cauce's independent brand, 12 fictitious homeware products, generated/optimized product photos, homepage, collections, search, category filter, sorting, product details, persistent wishlists and cart. **This is a real browsable storefront frontend backed by a static synthetic catalog, not yet an end-to-end transactional merchant application.** The original Supabase/checkout/admin domain code is retained for reuse, but all legacy admin, checkout and payment endpoints are blocked by default at middleware level. No order can be paid or placed in this checkpoint. See `docs/CAUCE_M1_IMPLEMENTATION.md` for the tested boundary and next steps.

This repository originated as a reconstruction of a merchandising storefront for **La Mediterránea — Orquesta-Escuela Infantil y Juvenil**. That original commercial project was **not purchased or launched by the prospective customer**. It is now presented as a personal engineering case study, not a delivered customer success. Historical catalog, brand and product images remain here as provenance of that checkpoint, and are not used in the independent public showcase.

**[Explore the current public Cauce simulator](https://cauce-commerce-showcase-genova.vercel.app/)** — the currently deployed older browser-only technical demo in [`showcase/`](showcase/README.md) covering canonical pricing, stock conflicts, idempotent orders, payment callbacks and simulated admin permissions. The new Next.js retailer experience is implemented locally/in this branch and not yet published as the live store.

> **M2 isolated database checkpoint (2026-11-21):** Cauce now has an isolated Supabase catalog adapter, staff-only merchant panel at /gestion, validated product and stock APIs, stock ledger, and optional dynamic stock-aware shop. The independent Cauce Free-plan Supabase project has been **created, migrated, seeded with 12 synthetic products and partly RLS-tested**. Vercel preview env configuration remains **blocked by a 403 permission error**; real staff authentication and browser integration are pending. The original customer data, checkout and payment integrations remain untouched. See [M2 implementation and outstanding QA](docs/CAUCE_M2_IMPLEMENTATION.md). Until the preview is connected, the storefront still uses fictional static fixtures.

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

Copy `.env.example` to `.env.local`. Do not commit credentials. The public URL/key are used by the browser for RLS-protected catalog/Auth access; `SUPABASE_SECRET_KEY` stays server-only for the prepared payment workflow.

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
