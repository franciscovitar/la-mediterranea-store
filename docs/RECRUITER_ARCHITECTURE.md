# Cauce Commerce Lab — engineering case study

**Status:** personal engineering project. The source code began as a proposed merchandising store for La Mediterránea, but no customer purchase or operational launch is claimed. The public Cauce showcase has fictional branding and deliberately does **not** use the historical merchandising assets.

**Two separate environments:**

| Layer | What exists | What it proves |
| --- | --- | --- |
| Core repository | Next.js + TypeScript, Supabase database/storage, RLS-backed admin, checkout validation and a prepared payment adapter | The code paths and repository tests, not live payment processing |
| Local/CI checks | Catalog validation, TypeScript, checkout/authorization helper tests, build | Reproducible checks of the verified paths; not production traffic |
| Public `showcase/` | Static HTML/CSS/JS with a pure in-memory commerce state machine | Product semantics and explicit negative states, **not** the real Supabase backend |
| External provider | Mercado Pago adapter and signed webhook boundary prepared | Integration design; no production payment is asserted |

## The challenging part is authority, not product cards

The frontend cart holds user intent. It must never be the authority for a product's active state, unit price or fulfillment readiness. In the real code, `lib/commerce/checkout.ts` normalizes line inputs, merges duplicate variants and recalculates from a canonical catalog. `lib/commerce/cart.ts` reconciles stale browser carts against current catalog values; it does not trust a cached name or price. `lib/commerce/idempotency.ts` ties a checkout request identity to a normalized cart and buyer email.

Admin authorization uses `lib/admin/auth.ts`, a Supabase Auth identity and a membership lookup. Persistent database writes are subject to RLS and schema constraints. The backup/export and validated restore helpers form another separate safety boundary. Payment integration is documented in `docs/INTEGRATION_READY.md` and must remain disabled until credentials, end-to-end tests and operational checks exist.

```text
Browser cart (untrusted)
    ↓ normalize + reconcile + validate
Server checkout quote (canonical catalog)
    ↓ new order / idempotency boundary
Supabase order (persistent record)
    ↓ payment adapter (prepared; not live)
Signed provider callback + server provider-status read
    ↓ validated state transition / stock policy
Local order status
```

## Public failure exercises

| Scenario | Trigger in the demo | Demonstrated outcome |
| --- | --- | --- |
| Forged price | Browser asks to pay `ARS 1` | Canonical quote wins; client-supplied price is ignored |
| Stale inventory | A second actor removes the last stock | Quote and checkout revalidate, then fail with a conflict |
| Idempotency replay | Repeat same request key + same cart/email | Previous order reused without a new order |
| Idempotency collision | Same key, different buyer/cart | Conflict instead of silently reusing the wrong order |
| Duplicate payment callback | Identical approved event sent twice | One recorded inventory debit; later events deduplicated |
| Unauthorized admin | Visitor tries to modify stock | Denied before draft or publication |
| Draft isolation | Admin stages a stock change | Public catalog unchanged until explicit publication |
| Inventory exhausted after pending order | Provider status arrives late | Escalate to manual review; do not create negative stock |

The showcase implements these as intentionally **synthetic invariants** in `showcase/model.mjs` and tests 20 positive/negative paths in `showcase/model.test.mjs`. Some of its conservative state semantics (notably stock handling after a late simulated callback) are illustrative, not claims that the historical original implements identical business policy.

## Security and limits

- There is no real payment, user registration, external HTTP request, persistence, Supabase key or provider token in the public site.
- The role toggle is a **simulation**, not authentication or evidence of real RLS enforcement.
- The payment buttons do **not** perform or cryptographically verify HMAC; they model the valid/invalid branch after a hypothetical server verification.
- Public inputs contain only fake products, a fake email (`demo@example.test`) and deterministic callbacks.
- The original repository retains historical assets for traceability, but they are not copied into the public Cauce site. Replacing or licensing them for an independent, live retail brand remains future work.
- To turn this into a real retail launch: agree on fulfillment, ownership/licensing, product catalog and brand; complete the payment provider sandbox integration and end-to-end checks; obtain deployment authorization; verify RLS for anonymous, authenticated and administrator identities; then perform production readiness validation.

## Five-minute reviewer path

1. Open the Cauce web showcase; run the four failure cards.
2. Add a fictional item and create a pending order; repeat using the same key.
3. Simulate an approved callback twice. Check that only one debit happens.
4. Toggle administrator and try editing stock, both allowed and forbidden.
5. Inspect `lib/commerce/checkout.ts`, `lib/commerce/idempotency.ts`, `lib/admin/auth.ts`, `supabase/migrations`, `tests/`, `showcase/model.test.mjs` and the CI workflow.

This is a portfolio demonstration of full-stack engineering and reasoning under failure. It is not a claim of independent production operation, successful sales, or customer delivery.
