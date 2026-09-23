# La Mediterránea Store

Reconstruction of the public merchandising storefront for **La Mediterránea — Orquesta-Escuela Infantil y Juvenil**.

The storefront reads its operational catalog from Supabase and keeps the client experience unchanged. Mercado Pago was validated end-to-end with test credentials; production credentials remain a launch-time handoff.

## Current checkpoint

- Next.js + TypeScript storefront.
- Current public catalog and prices migrated from the existing site.
- Real product images and brand identity.
- Responsive catalog with category filters.
- Product color/size variants where defined by the current catalog.
- Persistent client-side cart with quantity controls.
- Server-authoritative checkout quote endpoint.
- Checkout UI with required buyer name/phone, pickup or delivery-to-coordinate, optional notes/email, and payment result pages.
- Supabase schema + seed applied for products, variants, stock, orders and admin authorization.
- Public storefront catalog, server-side checkout quote and authenticated admin persistence use Supabase.
- Supabase Storage serves product images with administrator-only writes.
- Magic Link authentication protects `/admin`; database RLS enforces the administrator role.
- Mercado Pago Checkout Pro Orders API adapter prepared behind environment variables.
- Signed Mercado Pago webhook endpoint validated in test, with idempotent paid-order notification hooks.
- Integration readiness endpoint and admin connection-status page.
- Admin product duplication, Supabase-backed backup/export/validated restore, and a real catalog preview with checkout disabled.
- Unit tests for server-side checkout validation and admin export helpers.
- Idempotency fingerprinting so a changed cart/email cannot accidentally reuse an older payment order.
- Basic security headers plus safe 404/error states.
- CI checks for catalog integrity, TypeScript, unit tests, production build and a critical-journey HTTP smoke.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Verify

```bash
npm run check
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
