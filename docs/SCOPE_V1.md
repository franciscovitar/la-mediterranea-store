# La Mediterránea Store — V1 scope

## Current objective
Deliver a clean storefront that can become a real ecommerce without rewriting the customer-facing experience when Supabase and Mercado Pago credentials become available.

## Completed storefront
- Next.js + TypeScript foundation.
- Current public catalog and current web prices.
- Real product imagery migrated from the existing page.
- Category filtering.
- Color and size selection where the current catalog defines those variants.
- Functional client-side cart with quantity controls and browser persistence.
- Responsive desktop/mobile UI.
- Basic accessibility and reduced-motion handling.
- Metadata and clean project structure.
- CI verification for catalog integrity, TypeScript and production build.

## Integration-ready checkpoint
- Server-authoritative quote calculation from product IDs/variants rather than trusting browser prices.
- Checkout review UI.
- Supabase SQL migration for catalog, variants, inventory, orders, order items, admin users and payment events.
- Idempotent order-creation RPC contract.
- Seed file for the current catalog.
- Mercado Pago Checkout Pro adapter using the current Orders API path.
- Idempotency key support for payment-order creation.
- Success, pending and failure return pages.
- Signed webhook verification and server-side provider status lookup.
- Integration readiness endpoint.
- Admin readiness page.\n- Local-draft admin workspace for create/edit/delete/duplicate products, variants, visibility and stock preparation.\n- JSON catalog import/export and stock CSV export so preparation work is portable before Supabase exists.
- Environment-variable contract with no committed secrets.

## Still requires real external accounts
- Create/select the client's Supabase project and apply the migration + seed.
- Create the first Supabase Auth admin user and register that user in `admin_users`.
- Add initial stock rows where stock tracking is desired.
- Add Supabase URL, publishable key and secret key to the deployment environment.
- Create/select the client's Mercado Pago application.
- Add Mercado Pago access token and webhook secret to the deployment environment.
- Configure the production HTTPS webhook URL and test event delivery.
- Run test purchases and validate order/payment/stock transitions.
- Production deployment and final acceptance pass.

## Explicitly outside V1 unless requested
- Customer accounts.
- Coupons.
- CRM.
- Invoicing.
- Shipping/logistics integrations.
- Automated refunds or cancellations from the store admin.

## Current Definition of Done
Without external credentials, a customer can browse the full catalog, choose variants, manage a persistent cart, open checkout and receive a server-authoritative quote. The repository contains the database/payment contracts and endpoints needed for connection. Supabase and Mercado Pago are not considered working until their real environments are connected and end-to-end tests pass.
