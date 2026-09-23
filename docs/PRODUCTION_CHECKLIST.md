# Production handoff checklist

This checklist is the final gate between the prepared local/integration-ready build and a live ecommerce.

## Before connecting accounts
- Review the catalog in `/admin`.
- Review the real catalog preview in `/admin/preview`.
- Download the full admin backup.
- Confirm which products/variants should track stock.
- Confirm fulfillment: pickup, delivery, shipping, or a combination.
- Confirm buyer fields and fulfillment copy. Current V1 requires name, phone/WhatsApp, email and pickup vs delivery-to-coordinate; notes are optional.

## Supabase
- Confirm the configured Supabase project contains the committed migrations and seed.
- Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, and `SUPABASE_SECRET_KEY` in the host's secret settings.
- Verify RLS as anon, authenticated non-admin, and admin.

## Mercado Pago
- Create/select the client-owned Mercado Pago application.
- Configure `MERCADOPAGO_ACCESS_TOKEN`.
- Configure `MERCADOPAGO_WEBHOOK_SECRET`.
- Set the production `NEXT_PUBLIC_SITE_URL`.
- Configure the HTTPS webhook at `/api/webhooks/mercadopago`.
- Test a payment, pending payment, failure, duplicate callback, and duplicate checkout attempt.
- Verify the local order only reaches paid from server-confirmed provider state.

## Transactional email
- Verify a sending domain in Resend.
- Configure `RESEND_API_KEY`, `ORDER_EMAIL_FROM`, and `ORDER_NOTIFICATION_EMAIL` in the host secret settings.
- Send a paid-order test and verify exactly one merchant email and exactly one buyer confirmation.
- Confirm duplicate Mercado Pago webhook delivery does not duplicate emails.

## Deployment
- Deploy the Next.js app on the chosen application host.
- Add environment variables in the host's secret settings.
- Confirm `/api/health` returns `ok: true`.
- Confirm admin and checkout routes are not indexable.
- Generate and commit `package-lock.json` from the final dependency set, then use reproducible installs for release CI/deploys.
- Run `npm run check` and `npm run test:e2e:smoke` against the release candidate.
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
