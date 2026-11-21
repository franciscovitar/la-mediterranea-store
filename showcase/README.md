# Cauce Commerce Lab — public interactive showcase

This directory is an intentionally **isolated, zero-credential, browser-only** portfolio experience for the production-shaped code in this repository. The storefront name, inventory, email and order events are invented. The historical La Mediterránea source catalog, logos and products are **not** served from this directory.

## What a recruiter can exercise

1. Add three fictional SKUs to a cart and request a canonical quote.
2. Tamper with the browser price; the model recomputes the server-owned total.
3. Race against a stock change; stale inventory fails closed on revalidation.
4. Create a pending order and replay its idempotency identity; changed email with the same identity conflicts.
5. Simulate provider-approved vs. pending payment status, invalid signatures, duplicate callbacks and one-time inventory deduction.
6. Switch fictional visitor/admin roles, stage a draft inventory change and publish it only with admin role.
7. Inspect deterministic business-event traces and metrics.

All examples live in a pure state machine (`model.mjs`) with 20 automated negative/positive test cases (`model.test.mjs`). Run with `npm test` or `node --test model.test.mjs`. Nothing persists after refresh.

## Authority boundary

The demo **does not** run Next.js, Supabase, real RLS, Mercado Pago, actual HMAC, or a checkout service. The original repository has these implemented or explicitly prepared as described in its main README and integration docs. Its Mercado Pago integration is not live. The demo is an explanatory model, **not proof** that the prepared payment adapter has ever processed a real payment.

This synthetic model deliberately demonstrates one conservative invariant — inventory does not become negative when the approved simulated callback races with remaining stock. It routes that situation to manual review. This should not be confused with a verified production policy of the original backend.

Deployment: create a separate Vercel project linked to this repository with `rootDirectory: showcase`, keep the original application and credentials isolated, and disable Vercel Authentication only on the new public showcase project. The historical source/brand assets remain elsewhere in the original repository for provenance but are never required by this public site.
