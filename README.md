# La Mediterránea Store

Reconstruction of the public merchandising storefront for **La Mediterránea — Orquesta-Escuela Infantil y Juvenil**.

This repository intentionally starts with the storefront only. Database/admin, payments and WhatsApp are deferred to a later stage so the first build stays small, testable and appropriate for the project budget.

## Current checkpoint

- Next.js + TypeScript.
- Current public catalog and prices migrated from the existing site.
- Real product images and brand identity.
- Responsive catalog with category filters.
- Product color/size variants where defined by the current catalog.
- Persistent client-side cart with quantity controls.
- CI checks for catalog integrity, TypeScript and production build.

## Run locally

```bash
npm install
npm run dev
```

## Verify

```bash
npm run check
```

## Scope and provenance

- [V1 scope](docs/SCOPE_V1.md)
- [Source notes](docs/SOURCE_NOTES.md)
