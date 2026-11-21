# Cauce — Ecommerce capability research and prioritization

Research checkpoint: **2026-11-21**. Status: **research-backed product direction, not implemented features or field outcomes**. Scope: a premium, fictional Argentine B2C store that demonstrates real full-stack engineering rather than teaching architecture inside the UI.

## Question and method

What would a modern merchant-facing online store need to be **credible, usable and technically demanding**, while reusing the existing Next.js/Supabase implementation? Compared (a) actual codebase constraints, (b) native product capabilities represented by mature commerce platforms, (c) primary usability research, (d) payment, security, accessibility, search and analytics vendor/reference guidance. Prioritize complete journeys over a maximum feature count.

**Evidence labels:** `EXISTING` = verified source-path inventory only; `REFERENCE` = documentation/research, not proof implemented here; `PROPOSED` = chosen direction. We have not conducted buyer interviews, production user testing, priced platform migration, actual payment QA or a measured performance benchmark.

## Marketplace-grade capability map

| Area | Credible features | Engineering signal | Cauce priority |
| --- | --- | --- | --- |
| Discovery | Editorial homepage, curated collections, taxonomy, search, sort, combined attribute filters, empty-state recovery | URL state, search design, server rendering, accessible form controls | **P0** |
| Product | Dedicated PDP, gallery, variants/SKUs, stock/availability, related items, transparent delivery and returns | Variant identity, media model, SEO, domain rules | **P0** |
| Cart / checkout | Persistent cart, canonical totals, shipping estimate, guest flow, explicit order confirmation, retry | Validation, idempotency, transactional integrity | **P0** |
| Merchant back office | Product/media CRUD, publish drafts, inventory updates, order fulfillment, role-gated actions | Authz/RLS, workflow state machines, audit and restore | **P0–P1** |
| Merchandising | Coupon/automatic promotions, bundles, stock alerts, merchandising slots | Rules engine and mutually exclusive promotion constraints | **P1** |
| Customer service | Scoped order tracking, return request, cancel/refund test state, optional saved items | Privacy, order lifecycle, compensating actions | **P1** |
| Analytics | Sales/events dashboard, conversion funnel, cart/checkout/purchase/refund events with consent | Event contracts, dedupe, reporting integrity | **P1** |
| Growth and SEO | Search snippets/ProductGroup metadata, canonical URLs, media performance, structured analytics | SSR, SEO, measurement/perf tradeoffs | **P0–P1** |
| Differentiated extras | Loyalty, personalized recommendations, AI assistant, subscriptions, live carrier, multi-currency | Advanced integrations, experimentation | **P2 / only if justified** |

## Evidence and implications

### 1. Mature storefront platforms define the ordinary baseline

- Shopify's Storefront Cart model includes lines, buyer identity, calculated cost, discounts, delivery groups, gift cards and a `checkoutUrl`. This is **reference for what a real cart must consider**, not an argument to copy every Shopify object into Cauce. [Official Cart API](https://shopify.dev/docs/api/storefront/latest/objects/Cart).
- Its admin Order object spans financial and fulfillment state, line items, returns and refunds; those are **separate merchant operations**. Cauce currently conflates payment-oriented status with broader order handling; separate payment and fulfillment flows in the target. [Official Order API](https://shopify.dev/docs/api/admin-graphql/latest/objects/Order).
- Discounts may apply to products, orders or delivery. For Cauce, implement a narrower server-authoritative subset with explicit eligibility, exclusions and tests before expanding to a general promotion DSL. [Official discounts architecture](https://shopify.dev/docs/apps/build/discounts).

**Inference:** a credible recruiter-facing store must work beyond the `add to cart` button: testable checkout, coherent shipping/order states and an operator workflow matter more than a decorative discount badge.

### 2. Usability research prioritizes search/filter and a shorter checkout

- Baymard's first-party product listing and filtering research documents recurring problems when shoppers cannot evaluate, filter or sort catalog items. Use meaningful multifilter controls, filters matching visible attributes and product cards with enough information. [Research overview](https://baymard.com/research/ecommerce-product-lists); [filter interaction discussion](https://baymard.com/blog/ecommerce-filter-ui).
- Baymard's checkout research identifies unnecessary form fields/complexity as abandonment friction. Use guest checkout, prefill/autocomplete and concise clear fields; **do not** add mandatory registration merely to exhibit Auth skills. [Checkout-field study](https://baymard.com/research-articles/checkout-flow-average-form-fields); [checkout research](https://baymard.com/research/checkout-usability).

**Evidence limit:** Baymard findings describe broader ecommerce UX studies, not measured behavior of Cauce buyers. Prioritize as design hypotheses and verify representative mobile usability locally.

### 3. Argentine payments: integrate carefully, not theatrically

- Mercado Pago's Checkout Pro Orders documentation describes signed webhook notifications with secret-based HMAC verification and provider-side state/status. Cauce already has a **prepared** adapter; this does not constitute active credentials, test payments or accepted money. [Mercado Pago Orders notifications](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/notifications).
- Build deterministic server-side **test checkout** and signed-event/reconciliation tests first. Do not place simulated `approve payment` buttons on customer screens or believe browser `success` query params.

**Important source-level risk:** existing SQL checks stock before later decrement on payment event without a documented final-unit concurrency test across **two orders**. Decide lock/reservation/conditional debit and prove it. Historical synthetic `showcase/model.mjs` scenarios are useful test cases, not evidence the production SQL already passes them.

### 4. Security and roles are a genuine differentiator

- Supabase documents RLS as row/operation-specific policies and recommends testing both allowed and denied SELECT/INSERT/UPDATE/DELETE cases, with server secret keys kept off the client. Current Cauce has RLS/admin coverage but only a single admin-users concept. Add role breadth only with verifiable least-privilege tests. [Supabase RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security).
- Existing `@supabase/ssr` matches cookie-session SSR use cases in Supabase's current package guidance; a dependency rewrite is not intrinsically required. [Supabase package guidance](https://supabase.com/docs/guides/auth/choosing-a-server-package).

### 5. Public discoverability and measurement

- Google documents `Product` merchant listing data and `ProductGroup`/`hasVariant`/`variesBy` for variants. Add eligible real product metadata and unique canonical product URLs to actual PDPs; don't advertise fictitious stock or search eligibility as guaranteed. [Merchant listing](https://developers.google.com/search/docs/appearance/structured-data/merchant-listing) and [product variants](https://developers.google.com/search/docs/appearance/structured-data/product-variants).
- Google's GA4 ecommerce model defines `view_item`, `add_to_cart`, `begin_checkout`, `purchase`, `refund` and item-level attributes. Measure consented sandbox events separately from business revenue; dedupe transaction IDs. [GA4 ecommerce](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce) and [validation](https://developers.google.com/analytics/devguides/collection/ga4/validate-ecommerce).
- Google's Web Vitals include LCP, INP and CLS; capture actual page/interaction measures rather than promising a score. [Web Vitals reference](https://web.dev/articles/vitals). Accessibility baseline: [WCAG 2.2](https://www.w3.org/TR/WCAG22/).

## Comparison: custom stack versus hosted commerce

| Option | When it fits a real merchant | Impact on this project |
| --- | --- | --- |
| Shopify | Merchant wants proven hosted checkout, catalog/discount/shipping integrations, lower custom-ops burden | Viable **business alternative**, but a migration would hide much of the custom architecture this project is intentionally demonstrating |
| WooCommerce | Merchant needs WordPress content/editing ecosystem and accepts ongoing plugin/security maintenance | Could fit clients; adds a completely new maintenance stack to Cauce without a validated need |
| Existing Next.js + Supabase | Merchant has differentiated workflows, engineering support, needs custom transactions/back office | **Recommended for this personal showcase**, because 2026 repository already implements many boundaries; higher owner responsibility/cost is acknowledged |
| Build new UI framework / microservices | Requirement truly exceeds current monolith or scale isolation needs | **Reject for now**: high migration/operational cost without evidence; strengthen the existing code instead |

## What *not* to build merely to impress

- Fake ratings/reviews, scarcity, client testimonials or production sales counters.
- A public arbitrary outbound webhook tester or real payments just to make a demo interactive.
- A bespoke recommendation ML system before search/filter/product detail works.
- Excessive scroll motion/3D that worsens mobile LCP, keyboard operation or product comprehension.
- A home page listing architecture patterns, error codes and engineering diagrams: **that material belongs in the portfolio View Case**.
- Forced sign-up, bloated checkout, customer PII in a shared test instance, hidden subscription charges or unverified shipping/tax promises.

## Priority decision and implementation order

1. **P0 store coherence**: fictional brand/assets, product pages, useful navigation/search, variant selection, cart and concise guest test checkout.
2. **P0 real operational integrity**: canonical quote, transactional idempotency, concurrency-safe stock, genuine isolated persistence, admin order/catalog tasks and negative tests.
3. **P1 merchant depth**: promotions, fulfillment, stock adjustment ledger, returns/refund simulation, audit, reporting, optional scoped order history.
4. **P1 polish/SEO/ops**: proper metadata, schema, semantic keyboard UX, responsive/perf measurements, error recovery, backup/restore and seeded reset.
5. **P2 experiments** only when a specific use case justifies them.

## Adversarial audit and open evidence

The best argument **against** custom ecommerce is maintenance and payment/security liability; this is a deliberate engineering portfolio tradeoff, not a recommendation to every client. The best argument against a feature-rich showcase is reliability: a smaller fully exercised store is stronger evidence than fifteen unusable features. Dynamic shipping, VAT/tax, refunds, bank details and legal policies require real merchant rules before production; no fabricated compliance. Public sandbox isolation and replay security need end-to-end tests, not just UI clicks. Asset rights, mobile QA, performance budgets and hosting costs remain to be validated.

**Next research refresh:** when implementing a given external integration, reverify the exact provider API, license, cost and operational policies at that time. Product hypotheses above are a documented baseline, not a finished customer discovery or field certification.

Related: [product direction](PRODUCT_DIRECTION_V2.md) · [technical architecture](ARCHITECTURE_V2.md).
