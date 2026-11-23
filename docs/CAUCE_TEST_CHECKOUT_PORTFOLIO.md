# Cauce Commerce Lab — Portfolio test checkout (implementation)
Date: 2026-11-23

## Scope and design

The checkout now displays **public, official Mercado Pago Checkout Pro test card data** with copy controls and APRO, OTHE and CONT scenarios. The user enters these fields only on Mercado Pago's checkout site; Cauce never receives or stores complete card details. The scenario selection modifies only the **on-screen test instructions** and never the payment/order state. The server verifies provider identity, seller, original order, amount, currency and allowed public test-card fingerprint before applying a payment result.

Official documentation:
- https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-preferences/integration-test/test-purchases
- https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-preferences/test-accounts

**Do not advertise this as certified end-to-end or available for public test transactions until directly observed.** Checkout Pro Preferences documentation may require a dedicated Mercado Pago *test buyer* login. Never publish a test-buyer password, a webhook bypass secret or seller access token.

## Non-negotiable runtime boundary

- The historical La Mediterránea Production project must continue to run with Cauce standalone mode and checkout disabled.
- Enable `CAUCE_CHECKOUT_ENABLED=true` only in the separate `cauce-retail-preview` project, initially while SSO stays enabled.
- The flag alone is insufficient: `cauceSandboxPaymentProcessingConfigured()` must also validate the isolated Supabase and test-seller credentials, notification URL origin and protected webhook bypass. The provider account is independently verified via `/users/me`.
- The public portfolio page may describe the implementation, but a public interactive payment demo requires an explicit access/threat-model decision, test buyer login procedure, quota protection, cleanup policy and observed payment E2E.
- Do not replace Mercado Pago's card form with a homemade card form.

## Acceptance gate — not yet claimed

1. Deploy this PR head into the **existing isolated Cauce project** and inspect checkout presentation at desktop and mobile widths.
2. Verify `CAUCE_CHECKOUT_ENABLED=true` only on intended isolated Preview and that protected checkout uses test seller credentials. Check callback/return origin and webhook protection.
3. Run an actual provider transaction with APRO, then verify returned order state and inventory by readback.
4. Run OTHE and CONT where permitted; verify no incorrect inventory depletion.
5. Re-send the same authentic signed webhook; check exactly-once provider event and inventory movement.
6. Confirm history/production stores remain unchanged; never claim a test PASS without observed evidence.

This PR deliberately contains no payment-provider credential changes, production deployment, checkout flag activation or public SSO changes.
