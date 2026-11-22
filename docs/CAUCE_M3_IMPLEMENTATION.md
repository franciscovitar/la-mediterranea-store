# Cauce Commerce Lab — M3 test-only order/payment flow

**Checkpoint:** 2026-11-22. **Scope:** isolated Cauce branch, local code and tests; no historical merchant changes, live charges, Production deploy, or protected-branch merge. The sandbox payment flow is **NOT end-to-end certified** until test credentials, an observed test-card purchase and signed webhook are verified.

## Existing source of truth / recovery

- GitHub PR #18: `feat/cauce-retail-foundation-20261121` on `franciscovitar/la-mediterranea-store`, M1/M2 baseline at `d2c436dbbb3db249bf15532a56f5cadc96d6f872` before this patch.
- Independent Supabase project `cauce-commerce-lab`, ref `erswrerhpmvviedudzit`. On 2026-11-22 read-only SQL showed 12 synthetic products, 154 units, 0 orders and 0 payment events. This is **not** the historic La Mediterránea database.
- Prior chat had already applied M3 tables/functions to this isolated database. We read their real signatures/definitions and captured an independently reviewable **fresh-M2 snapshot** in `supabase/cauce/SCHEMA_M3_CHECKOUT_SNAPSHOT.sql`. Do **not** reapply it to the existing migrated project.
- The locally reported implementation and 39 tests from the earlier chat were **not available** in this checkout. This code is a reconstruction, not a claim to have retrieved those files.

## Purchase flow

1. Cauce's **own** cart links to `/pedido` for a server-authoritative quotation. The historic `/checkout`, `/api/checkout/*`, `/api/webhooks/mercadopago` and `/admin` remain blocked in Cauce.
2. `POST /api/cauce/checkout/quote` validates unique product IDs and quantities, retrieves the active catalog and stock from the configured Cauce source, and recomputes integer ARS prices. Client prices/names are ignored. This endpoint can work without payment credentials.
3. `POST /api/cauce/checkout/create` is *fail-closed* unless a separate Cauce DB secret, Checkout Pro `APP_USR` credential, numeric authorized test seller ID, webhook secret, exact HTTPS preview origin, explicit feature flag and Cauce database mode are all configured. The prefix alone is **not** a test-mode guarantee: before every provider API request, the server independently reads `GET /users/me`, requires the exact configured seller ID and provider `test_user` tag, and refuses the operation if verification fails or is unavailable. Preferences must name that same `collector_id` and return the exact documented Checkout Pro hostname/path/preference ID. A transactionally guarded Supabase RPC locks stock, checks existing reservations, creates at most one order for a UUID request key and stores the authoritative item/price snapshot. A repeated key with a different cart is rejected.
4. The server creates a Mercado Pago Checkout Pro preference using **stored** items, `external_reference=orderId`, test return URLs and a webhook endpoint. Current Checkout Pro test accounts use the normal `init_point` URL (`www.mercadopago.com/mla/checkout/start`), **not** the retired `sandbox_init_point`. The protection against real charges is the provider-verified seller `test_user` identity, verified collector ID and `live_mode=false` on payment reconciliation; the hostname alone never proves test mode. A second attempt with an existing preference retrieves its verified URL.
5. `POST /api/cauce/checkout/webhook` verifies Mercado Pago's HMAC-SHA256 signature, request id, payment id and timestamp. It then queries `GET /v1/payments/{id}` server-side with the TEST token. Only a provider-confirmed amount, ARS currency, `live_mode=false`, matching `external_reference` and recognized status reach the DB payment RPC. URL/redirect query parameters **cannot mark an order paid**.
6. The DB RPC stores idempotent payment events and atomically converts the valid reservation to `paid_test` plus inventory/ledger updates. Duplicate approval is safe; late/discordant payment leads to `needs_review`. `/pedido/resultado` only reads status using the order UUID plus original client request key; it never decides approval.
7. After the 30-minute reservation window, read-only status reports `expired_test` rather than an indefinite `pending`. This is a **derived display status**: the DB row remains pending, and the provider must still confirm an eventual payment. A late approval is sent to `needs_review` without stock decrement.

## Threats, boundaries and open issues

| Risk | Current control | Outstanding verification |
| --- | --- | --- |
| Client tampers with price, quantity or product name | Strict parse, trusted quote, DB item/amount recomputation | Reproduce with HTTP tests in staging |
| Repeated create/approval double-reserves or double-decrements | UUID idempotency, database transaction and unique provider-event constraints | Concurrent request tests on deployed branch |
| Forged or replayed webhooks | Constant-time HMAC, timestamp freshness, provider GET and transactional DB update | Real Mercado Pago signature and retry observation |
| Accidentally using historical/live credentials | Dedicated Cauce-only vars, configured numeric test seller ID, provider `test_user` identity check on each request, collector-ID check, exact Checkout Pro URL and payment `live_mode=false`; historical checkout blocked | Real provider identity response must be observed before enabling |
| Unauthorized DB or public stock mutation | Service-only checkout RPCs; RLS on Cauce data; secret server-only | Re-run advisors and negative live tests after any DB migration |
| Abusive guest reservation/checkout spam | Feature flag disabled by default; preview access controls | **Add rate limiting / bot protection before public recruiter access** |
| Provider preference creation succeeds but local attach fails | Fail closed, no payment URL returned; 30-minute stock reservation expiry | Add reconciliation/cleanup and provider-failure retry scenario |
| Guest order remains `pending` after its reservation expires | Status API derives `expired_test`; expired reservations no longer block DB stock checks | Add durable expiry reconciliation for merchant history later |
| Return URL says approved while webhook is delayed | Browser status read is server-only; `pending` is not treated as paid | Observe eventual consistency across actual sandbox redirect/webhook |
| Chargebacks, refunds, shipments, taxes | Outside M3 test-only scope | Separate future scope/decision |

**Implementation caveat:** Mercado Pago's GET payment response must be inspected in a genuine sandbox test to establish whether it carries a trustworthy Checkout Pro preference identifier. Until then, the server validates `external_reference` against a locally stored preference/order and amount, without claiming an independent provider-side preference-ID comparison.

The exact Checkout Pro URL and HTTPS return-origin restrictions intentionally require an approved Vercel Preview domain. Local test builds can validate code, but cannot complete the remote redirect/webhook loop. Mercado Pago's API reference still displays the legacy sandbox field in examples, while the current provider integration guidance directs test-user checkouts through `init_point`; verify this behavior with a real test-account preference before enabling the feature.

**SSO-protected webhooks:** Vercel Authentication blocks third-party POST requests even when the shopper can log in. The isolated Cauce Preview requires a distinct project-scoped Vercel Automation Bypass secret (`VERCEL_AUTOMATION_BYPASS_SECRET`, injected by Vercel after enabling Protection Bypass for Automation) and appends it only to `notification_url` as `x-vercel-protection-bypass`; never to buyer return URLs or client bundles. Mercado Pago can then POST without a custom header. The bypass grants the holder access through deployment protection to **any** URL in this isolated Vercel project until revoked, so its creation/use needs specific owner consent, strict project isolation and rotation if exposed. No bypass has been generated or activated by this code change alone.

## Environment setup (only when separately authorized)

Use the Cauce variables from `.env.example`, never the historical Supabase/MP variables:

- `CAUCE_CATALOG_SOURCE=database` and the Cauce publishable Supabase URL/key from M2.
- `CAUCE_CHECKOUT_ENABLED=true` (explicit opt-in).
- `CAUCE_SUPABASE_SECRET_KEY` **only** from the isolated Cauce project; server-side secret, not `NEXT_PUBLIC_*`.
- `CAUCE_MERCADOPAGO_TEST_ACCESS_TOKEN` from a **verified test seller account**, which Checkout Pro may prefix with `APP_USR` (the same prefix can appear on real credentials). Never reuse the historical credential.
- `CAUCE_MERCADOPAGO_TEST_SELLER_ID`: numeric User ID of that **test seller**, verified against Mercado Pago's authenticated identity response and `test_user` tag before all provider operations. This runtime check intentionally fails closed if the provider does not return the expected evidence.
- `CAUCE_MERCADOPAGO_WEBHOOK_SECRET`: Cauce-only signed-notification secret.
- `CAUCE_CHECKOUT_ORIGIN` set to the exact HTTPS `*.vercel.app` staging origin, without trailing path, query or fragment.
- `VERCEL_AUTOMATION_BYPASS_SECRET`: automatically injected **only after** a dedicated, owner-authorized Vercel Preview project Protection Bypass is configured; required so Mercado Pago can reach signed webhooks behind SSO. Never paste it into GitHub, a browser-facing env, or chat; MP receives it only in its configured webhook URL.

Never paste secrets into source, PR descriptions, chat history or the global PAS. Staging protection and webhook reachability need review together: Mercado Pago must reach the webhook without exposing the test admin or real client data.

## QA commands and interpretation

```bash
npm ci --offline --no-audit --no-fund  # only when deps already cached
npm run typecheck
node --import tsx --test tests/*.test.ts
NEXT_TELEMETRY_DISABLED=1 npm run build
```

The plain `npm test` script uses `tsx --test`; in some restricted local runners it fails to create its IPC socket with `EPERM`. Using `node --import tsx --test` avoids that runner limitation. This is **not** an application-test failure and should not be silently treated as a CI success.

**Observed on this reconstruction (2026-11-22):** initial M3 baseline had 45/45 Node tests, TypeScript, Next.js build and 21 local HTTP smoke assertions. A second hardening pass corrected the Mercado Pago credential assumption and added fail-closed identity/collector verification plus expired status: **49/49 Node tests and TypeScript passed locally**. These are mocked provider tests, **not** real seller attestation, a real sandbox payment, a new Next.js build, or deployed QA until the corresponding steps are observed separately. The build host used Node 24 while the repository targets Node 22; repeat the same checks with Node 22 in its intended runtime before release. Attempted Chromium screenshots could not run because the workspace refused its Unix socket (`Operation not permitted`); **visual/browser QA remains NOT RUN**, not PASS. Supabase security advisor still reports the documented staff-only `cauce_set_stock` SECURITY DEFINER warning and an unrelated password-protection warning; do not silently suppress them.

**References rechecked 2026-11-22:** Mercado Pago Developers, Checkout Pro *Cuentas de prueba*, *Realizar compras de prueba* and Preferences API *Crear/Obtener preferencia*, plus official credential instructions for `/users/me`. The provider's actual `tags` identity response must be verified in situ; if this check is unsupported for a specific test account, keep checkout **OFF** pending another independently verifiable assertion of test-seller identity. Never weaken it by trusting the `APP_USR` prefix.

**Release gates:** unit/build, authenticated staff CRUD + concurrency, SQL readback, sandbox preference, test-card approved/rejected/pending, signed webhooks, duplicate/late event, stock reconciliation, protected preview review, human approval before any broader public release. No credential-free mock test certifies these real payment scenarios.
