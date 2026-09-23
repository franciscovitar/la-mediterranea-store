# Integration-ready checkpoint

Supabase is connected. Mercado Pago test checkout/webhook validation is complete; production credentials remain a launch-time handoff.

## Why this exists

The storefront should not be rewritten when the client accounts arrive. The browser cart remains a convenience UI, but prices, orders and payment state are designed to become server-authoritative.

## Supabase connection

Project `urmbjxmijtwovkzmvoav` is the current backend of record.

1. Migrations in `supabase/migrations` and the checked-in catalog seed have been applied.
2. The first Magic Link administrator is registered in `public.admin_users`.
3. Add inventory rows only where stock tracking is desired; no quantities were invented.
4. Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in the production host's secret settings.

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

## Order contact and transactional email

Checkout now persists buyer name, phone/WhatsApp, required email, optional notes, and pickup vs delivery-to-coordinate through the additive `create_checkout_order_v2` RPC. Paid-order emails use Resend only after Supabase records the order as `paid`. Merchant and buyer emails are claimed in Supabase and also use provider idempotency keys to reduce duplicate delivery risk. Configure `RESEND_API_KEY`, `ORDER_EMAIL_FROM`, and `ORDER_NOTIFICATION_EMAIL`; no secret values belong in Git.

## Current safe behavior without credentials

- The storefront reads the active catalog from Supabase and reconciles saved carts against it. Production no longer silently falls back to bootstrap catalog data if Supabase public configuration is missing.
- `/checkout` recalculates the order from the server-owned Supabase catalog.
- The real pay button stays disabled because Mercado Pago is not configured.
- `/admin` requires Magic Link authentication and persists product, stock and image changes through Supabase RLS/Storage.
- `/auth/confirm` verifies the Magic Link `token_hash` and writes the SSR session cookies before redirecting to `/admin`.
- `/admin/preview` is admin-protected and reads the real Supabase catalog; checkout stays disabled there.
- No secret values are committed.

## Important production gate

Do not call payments, stock or admin "done" merely because environment variables exist. Before launch, verify:

- database migration applied;
- RLS/admin authorization tested;
- real/test Mercado Pago order creation works;
- signed webhook is received;
- provider status is fetched server-side;
- duplicate checkout attempts do not create duplicate provider orders;
- payment success does not depend on return-page query parameters;
- the success return page does not clear the cart or mark payment as final before server confirmation;
- checkout idempotency is tied to the canonical cart + buyer-details fingerprint so a changed order gets a new request id;
- stock behavior is tested with tracked and untracked products;
- HTTPS production deployment is live.


## Backup and recovery

Before changing operational data, download the full admin backup from `/admin`. The same panel can restore a validated backup to Supabase only after an explicit administrator confirmation.

## Auth email delivery

Magic Link SSR was validated locally with Resend's test sender and the temporary permitted recipient. Before `franvitar15@gmail.com` can receive production Magic Links, verify a sending domain in Resend (or configure the definitive SMTP sender).


## Mercado Pago status coverage

The prepared order-state mapping covers the current Checkout Pro Orders lifecycle used by the integration: created/processing/action-required states remain pending, processed+accredited becomes paid after amount/stock validation, failed/canceled become payment failure, and both documented full-refund forms are recorded as refunded. External refund automation/restocking remains intentionally outside V1.
