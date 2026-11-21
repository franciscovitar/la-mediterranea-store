# Cauce Commerce Lab — Product-first direction

Status: **owner-approved product goal; architecture proposed; implementation not yet delivered**.
Decision date: 2026-11-21 (Argentina).
Repository: `franciscovitar/la-mediterranea-store`.

## The non-negotiable product goal

Build **a credible, beautiful, usable online store** that an actual small/medium merchant could operate after the normal production integrations, policies and handoff. A visitor should browse products, choose variants, buy in a safe test environment and see ordinary storefront affordances. An authorized operator should be able to manage the store, not watch a technical lecture.

The **portfolio case study** (`franvitar.genovasite.com/work/cauce-commerce-lab`) explains architecture, decisions, security, tests, limits and what was reused. The public application's home page, catalog and admin screens must not be a guided architecture simulator, a sales pitch about idempotency or a collection of programming scenarios.

This supersedes `showcase/` as the **target visitor experience**, but does **not** delete or invalidate that existing 20-test synthetic model: retain it as a QA/diagnostic teaching artifact under a separate lab/docs path until equivalent real-system tests exist.

## Identity, provenance and public claims

- **Cauce** is a fictional lifestyle/objects retail brand and fictional catalog. Use independently authored visual assets and product data, not the prior prospect's name, logos, photography or company claims.
- The previous La Mediterránea proposal was **not purchased or launched**. Keep the historic code/assets for traceable source history, but do not serve them to consumers of the Cauce experience.
- Source code and CI can be real while the public environment uses isolated demo data. Label test mode discreetly where it matters; never describe browser-only simulation as Supabase persistence or real payment processing.
- **No live charges, actual messages, real shipments, personal customer records or arbitrary external webhooks** without separate authority and credentials. No need to activate any of these to design or build the product.

## Roles and customer journeys

| Role | End-to-end job that should be possible | Acceptance example |
| --- | --- | --- |
| Guest shopper | Discover items, compare variants, save a cart, enter a concise test checkout, track a test order | Add two SKUs, change variant, review authoritative total, submit test checkout and view coherent order state |
| Returning shopper (optional account) | See past orders and saved preferences without forcing registration at checkout | Customer can retrieve **only their** seeded orders or use a narrowly scoped tracking token |
| Catalog manager | Create/update products, images, collections, prices, variants and publication state | Draft preview does not affect public stock/catalog until publish |
| Fulfillment operator | Inspect paid orders, allocate/pack/ship test orders, record adjustments and exceptions | A paid order progresses through a separate fulfillment lifecycle, with audit trail |
| Store owner | Configure promotion and stock policies, inspect sales funnel/operations, restore from tested backup | Reports aggregate real seeded order state; administrative changes are permission-gated |

## Experience standards

The customer-facing site should include a premium editorial home, curated collections, discoverable navigation, searchable/filterable/sortable product lists, genuine product detail pages with rich media and variants, cart, shipping/returns information, checkout, confirmation/status and a clean responsive mobile journey. Accessible controls and honest states (loading, no results, no stock, invalid promo, failed payment) are part of the product.

The administrative area should feel like a coherent merchant back office: dashboard, catalog, stock, orders/fulfillment, promotions and audit/activity; avoid cramming every task into one giant form.

Show craftsmanship through the experience. **No architecture explainer panels in the store UI.** Keep an unobtrusive `Entorno de prueba` disclosure on any publicly hosted non-production transaction screen.

## Priorities: impressive because they are complete

### P0 — usable vertical slice, required before replacing current public showcase

1. Rebrand the original Next.js storefront and its bootstrap/DB seeds to a newly authored Cauce catalog and imagery; verify no old merchant assets are rendered.
2. Build a coherent retail information architecture: landing, collection, product detail, search/filter/sort, cart, shipping/returns pages and responsive navigation.
3. Preserve server-authoritative product prices, selected variants and stock checks. Checkout must revalidate canonical data; no browser-supplied amount is accepted.
4. Introduce a **safe test-order flow** with persistent isolated order state and transparent fulfillment/payment statuses. No active payment provider required.
5. Make core merchant tasks workable: product/variant CRUD, stock adjustments, order management, publish controls and useful feedback.
6. Protect public/private data with RLS/server authorization and tests of forbidden operations. Seeded demo data has explicit reset/reconciliation.
7. Pass automated unit/integration/E2E journeys plus accessibility and mobile QA against the **same application** that the recruiter visits.

### P1 — strong differentiators after P0 is observed

- Server-validated discount codes and promotions (conditions, limits, expiration, invalid/reused codes).
- Inventory movement ledger, reservation/expiration policy, low-stock alerts, concurrency-safe purchase and operational reconciliation.
- Separate payment/fulfillment/return state machines and partial-fulfillment/cancellation workflows; a refund test-mode workflow without provider-side money movement.
- Customer order tracking (scoped token or authenticated history), saved items and rich search with deep links.
- Merchant analytics sourced from orders/events, funnel instrumentation with consent, daily summaries and CSV export.
- Administrative roles (owner/catalog/fulfillment/support), audit records and tested backup/restore.
- Product SEO with canonical URLs and `Product`/`ProductGroup` structured data when content/variants genuinely meet eligibility rules.

### P2 — deliberate options, not an artificial feature checklist

Bundles, gift cards, loyalty points, subscriptions, localized taxes, live freight quotation, reviews, AI-assisted catalog operations and multi-currency may be valuable **only after** their actual merchant problem, data ownership, cost and maintenance load justify them. Do not implement each one just to inflate a skill count.

## Definition of Done for this product direction

- A first-time visitor can operate a realistic test purchasing journey **without learning technical jargon** and can distinguish test mode from a charged transaction.
- The operator can complete a catalog update, stock adjustment and order fulfillment without direct DB edits.
- No public endpoint leaks administrative operations or customer PII; permission-denial and replay/concurrency tests exist.
- Price, discount, shipping, stock and order-state transitions have **one canonical server-side authority** each, with negative-case tests.
- A representative complete run against isolated persistence is verified, not inferred from a static prototype. Performance, mobile, keyboard/focus, errors and backup/restore are checked.
- The portfolio case accurately labels code, deployment, test evidence and inactive integrations. No fabricated customer adoption or production transactions.
- Existing `showcase/`, the Next.js core, Supabase contracts and prior CI remain recoverable until replacement flows are verified and accepted.

## External boundaries

No authorization is implicit to migrate real Supabase data, enable payments, send email, buy a domain or change a production service. Those are later specific decisions. The immediate authorized deliverable is the persisted product target and proposed architecture/research.

Detailed design: [ARCHITECTURE_V2.md](ARCHITECTURE_V2.md). Feature investigation: [FEATURE_RESEARCH_20261121.md](FEATURE_RESEARCH_20261121.md).
