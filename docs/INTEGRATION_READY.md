# Integration-ready checkpoint

This checkpoint intentionally prepares the commerce backend without pretending Supabase or Mercado Pago are already connected.

## Why this exists

The storefront should not be rewritten when the client accounts arrive. The browser cart remains a convenience UI, but prices, orders and payment state are designed to become server-authoritative.

## Supabase connection

Use the client's own Supabase organization/project.

1. Create the project.
2. Apply `supabase/migrations/20260920_001_commerce.sql`.
3. Apply `supabase/seed.sql`.
4. Create the first administrator with Supabase Auth.
5. Insert that Auth user UUID into `public.admin_users`.
6. Add inventory rows only for variants/products where stock should be tracked.
7. Configure `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` in the deployment environment.

The application uses the 2026 Supabase key model: publishable keys are safe for low-privilege public/authenticated clients when RLS is correct; the secret key stays server-only and bypasses RLS.

## Mercado Pago connection

The adapter is prepared for **Checkout Pro via Orders API**.

1. Create/select the client's Mercado Pago application.
2. Configure `MERCADOPAGO_ACCESS_TOKEN` server-side.
3. Configure `NEXT_PUBLIC_SITE_URL` with the HTTPS production URL.
4. Configure the webhook URL as `https://YOUR_DOMAIN/api/webhooks/mercadopago`.
5. Configure `MERCADOPAGO_WEBHOOK_SECRET` server-side.
6. Run a test purchase and a simulated webhook.
7. Verify the local order transitions to the provider status and stock only changes on an accredited event.

The server sends an `X-Idempotency-Key` when creating the Mercado Pago order. The webhook verifies the HMAC signature and then fetches the provider order directly before mutating the local order.

## Current safe behavior without credentials

- The catalog and cart keep working.
- `/checkout` recalculates the order from server-owned catalog data.
- The real pay button stays disabled.
- `/admin` includes a functional local-draft workspace for products and stock. It intentionally does not publish or write to a remote database until Supabase Auth is connected.\n- Draft products can be exported/imported as JSON and draft stock can be exported as CSV.\n- `/admin/preview` renders the saved draft through the real storefront UI while keeping checkout disabled.\n- The admin can export one backup file and an initial Supabase SQL import so prepared work does not need to be re-entered.
- No secret values are committed.

## Important production gate

Do not call payments, stock or admin "done" merely because environment variables exist. Before launch, verify:

- database migration applied;
- RLS/admin authorization tested;
- real/test Mercado Pago order creation works;
- signed webhook is received;
- provider status is fetched server-side;
- duplicate checkout attempts do not create duplicate provider orders;
- payment success does not depend on return-page query parameters;\n- the success return page does not clear the cart or mark payment as final before server confirmation;\n- checkout idempotency is tied to the canonical cart + email fingerprint so a changed order gets a new request id;
- stock behavior is tested with tracked and untracked products;
- HTTPS production deployment is live.


## Backup and recovery

Before changing the backend integration, download the full admin backup from `/admin`. The same panel can restore that backup into local draft mode, so catalog and stock preparation are recoverable before Supabase becomes canonical.


## Mercado Pago status coverage

The prepared order-state mapping covers the current Checkout Pro Orders lifecycle used by the integration: created/processing/action-required states remain pending, processed+accredited becomes paid after amount/stock validation, failed/canceled become payment failure, and both documented full-refund forms are recorded as refunded. External refund automation/restocking remains intentionally outside V1.
