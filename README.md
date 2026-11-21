# Cauce Commerce Lab · Full-stack commerce engineering (historical source: La Mediterránea Store)

This repository originated as a reconstruction of a merchandising storefront for **La Mediterránea — Orquesta-Escuela Infantil y Juvenil**. That original commercial project was **not purchased or launched by the prospective customer**. It is now presented as a personal engineering case study, not a delivered customer success. Historical catalog, brand and product images remain here as provenance of that checkpoint, and are not used in the independent public showcase.\n\n**[Explore the public Cauce Commerce Lab](https://cauce-commerce-showcase-genova.vercel.app/)** — a separate fictional, client-free, browser-only engineering demo in [`showcase/`](showcase/README.md) covering canonical pricing, stock conflicts, idempotent orders, payment callbacks and simulated admin permissions.

The storefront reads its operational catalog from Supabase and keeps the client experience unchanged. Mercado Pago remains intentionally disconnected until its real credentials are available.

## Current checkpoint

- Next.js + TypeScript storefront.
- Current public catalog and prices migrated from the existing site.
- Real product images and brand identity.
- Responsive catalog with category filters.
- Product color/size variants where defined by the current catalog.
- Persistent client-side cart with quantity controls.
- Server-authoritative checkout quote endpoint.
- Checkout UI and payment result pages.
- Supabase schema + seed applied for products, variants, stock, orders and admin authorization.
- Public storefront catalog, server-side checkout quote and authenticated admin persistence use Supabase.
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
