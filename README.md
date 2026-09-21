# La Mediterránea Store

Reconstruction of the public merchandising storefront for **La Mediterránea — Orquesta-Escuela Infantil y Juvenil**.

The storefront is complete enough to browse the catalog and manage a persistent cart. The repository now also contains an **integration-ready commerce layer** so Supabase and Mercado Pago can be connected later without redesigning the storefront.

## Current checkpoint

- Next.js + TypeScript storefront.
- Current public catalog and prices migrated from the existing site.
- Real product images and brand identity.
- Responsive catalog with category filters.
- Product color/size variants where defined by the current catalog.
- Persistent client-side cart with quantity controls.
- Server-authoritative checkout quote endpoint.
- Checkout UI and payment result pages.
- Supabase schema + seed prepared for products, variants, stock, orders and admin authorization.
- Mercado Pago Checkout Pro Orders API adapter prepared behind environment variables.
- Signed Mercado Pago webhook endpoint prepared.
- Integration readiness endpoint and admin connection-status page.\n- Local-draft admin workspace for adding/editing products, preparing variants and drafting stock before Supabase is connected.\n- Draft storefront preview, portable admin backup and generated initial Supabase SQL.\n- Unit tests for server-side checkout validation and draft/export helpers.
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
```

## Connect later

Copy `.env.example` to `.env.local` only when the real accounts exist. Do not commit credentials.

The remaining external setup is documented in [Integration-ready checkpoint](docs/INTEGRATION_READY.md).

## Scope and provenance

- [V1 scope](docs/SCOPE_V1.md)
- [Integration-ready checkpoint](docs/INTEGRATION_READY.md)
- [Source notes](docs/SOURCE_NOTES.md)
