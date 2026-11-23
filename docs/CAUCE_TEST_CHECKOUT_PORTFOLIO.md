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

## UX visual audit and Checkout Pro test-buyer blocker — 2026-11-23

Screenshot-backed correction: `CauceCartProvider` previously rendered two consecutive `c-site` root containers. Both inherited `min-height: 100vh`, creating a full viewport of empty page after the footer. The cart overlay and toast now live inside **one root**, so no second minimum-height block is appended. Shared cart class names had inherited La Mediterránea's magenta text and old ink tokens. Cauce-only CSS variable overrides plus scoped selectors now use the olive/cream Cauce palette; historical CSS and markup are untouched.

Mercado Pago rendered **“Una de las partes con la que intentás hacer el pago es de prueba”** before card input. Per Mercado Pago official documentation, this is a mixed account-identity error (test seller vs real buyer). Checkout Pro Preferences requires a dedicated test-buyer account (not the seller, not a real user). A public card number alone cannot make test Checkout Pro self-service for arbitrary recruiters. Guidance is now shown before the pay button; no test-buyer credentials are published. To retry, sign in as a test buyer in a private Mercado Pago session, then return to the original isolated checkout. Actual provider E2E remains NOT_RUN until observed.

Sources:
- https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-preferences/test-accounts
- https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-preferences/integration-test/test-purchases
- https://www.mercadopago.com.ar/developers/es/docs/checkout-api-payments/error-messages/card-token-creation-errors

Acceptance: Cauce PR Preview only, responsive/mobile screenshot and scroll QA, historical production unchanged, no actual payments initiated during this CSS/documentation repair.

## M5 — Non-approved test payment evidence correction (2026-11-23)

Observed official Mercado Pago test runs: APRO approved and fully reconciled in Cauce. OTHE and CONT were accepted by provider, but Vercel logs showed `CAUCE_TEST_PAYMENT_VERIFICATION_FAILED { fields: ['officialTestCard'] }` on signed webhook and reconciliation. The isolated order `ff59f35f…` for ARS 74,500 remained pending, with zero associated inventory movements.

**Root cause:** Provider responses for non-approved attempts need not contain a recognizable card fingerprint. Previous logic required the exact official test-card fingerprint for every state, even though only an **approved** provider payment can cause a stock change. Prior RPC callers also supplied `p_test_card_verified: true` unconditionally.

**Fix:** retain strict exact-order, seller, amount, currency, provider-ID and valid-status checks for all results. Only `approved` requires matching an official test-card fingerprint. The webhook and reconciliation now send the **actual** test-card verification boolean; M5 RPC enforces this distinction and never marks a non-approved payment as paid. SQL permissions remain `service_role` only. The existing multi-attempt ambiguity remains fail-closed rather than guessing which attempt is valid.

**Acceptance:** Unit regression matrix for missing / partial / unknown card data across `pending`, `in_process`, `rejected`, `cancelled`; approved without matching card still rejected; CI/build; isolated M5 migration and readback. The original screenshot is provider evidence, not automatically a post-fix E2E rerun.
