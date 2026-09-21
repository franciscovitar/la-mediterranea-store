# Production handoff checklist

This checklist is the final gate between the prepared local/integration-ready build and a live ecommerce.

## Before connecting accounts
- Review the catalog in `/admin`.
- Review the draft in `/admin/preview`.
- Download the full admin backup.
- Confirm which products/variants should track stock.
- Confirm fulfillment: pickup, delivery, shipping, or a combination.
- Confirm which buyer fields are required for fulfillment.

## Supabase
- Create the client-owned Supabase project.
- Apply `supabase/migrations/20260920_001_commerce.sql`.
- Load the prepared catalog/stock using the generated admin SQL or the checked-in seed.
- Create the first Supabase Auth admin user.
- Register that user in `public.admin_users`.
- Configure `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY`.
- Replace local-draft admin persistence with authenticated Supabase reads/writes.
- Verify RLS as anon, authenticated non-admin, and admin.

## Mercado Pago
- Create/select the client-owned Mercado Pago application.
- Configure `MERCADOPAGO_ACCESS_TOKEN`.
- Configure `MERCADOPAGO_WEBHOOK_SECRET`.
- Set the production `NEXT_PUBLIC_SITE_URL`.
- Configure the HTTPS webhook at `/api/webhooks/mercadopago`.
- Test a payment, pending payment, failure, duplicate callback, and duplicate checkout attempt.
- Verify the local order only reaches paid from server-confirmed provider state.

## Deployment
- Deploy the Next.js app on the chosen application host.
- Add environment variables in the host's secret settings.
- Confirm `/api/health` returns `ok: true`.
- Confirm admin and checkout routes are not indexable.
- Generate and commit `package-lock.json` from the final dependency set, then use reproducible installs for release CI/deploys.
- Run `npm run check` against the release candidate.
- Test desktop and mobile.
- Verify product images and all return URLs over HTTPS.

## Acceptance
The store is ready only when a real end-to-end test can:
1. add a real product/variant to cart;
2. create a single local order;
3. open Mercado Pago;
4. receive a signed webhook;
5. verify the provider order server-side;
6. update the correct local order;
7. update stock only when intended;
8. show the result safely without trusting browser query parameters.
