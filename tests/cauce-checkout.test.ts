import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "node:crypto";
import { cauceProducts } from "../lib/cauce/catalog";
import { parseCheckoutLines, quoteCheckout, validCheckoutUuid } from "../lib/cauce/checkout";
import { cauceProtectedWebhookUrl, createCaucePreference, getCaucePreference, isVerifiedCauceTestSeller, safeTestCheckoutUrl, validateCauceProviderPayment, verifyCauceWebhookSignature } from "../lib/cauce/payments";
import { sameStoredLines, visibleCauceOrderStatus } from "../lib/cauce/order-store";
import { cauceSandboxCheckoutEnabled } from "../lib/cauce/config";

const product = cauceProducts.find((p) => p.active && p.price > 0)!;

test("client price/name changes cannot alter the trusted quote", () => {
  const lines = parseCheckoutLines([{ productId: product.id, quantity: 2, price: 1, name: "free" }]);
  assert.deepEqual(lines, [{ productId: product.id, quantity: 2 }]);
  const quote = quoteCheckout(lines, [{ ...product, stock: 8 }]);
  assert.equal(quote.total, product.price * 2);
  assert.equal(quote.items[0].name, product.name);
});

test("duplicate products, invalid quantities and product IDs are rejected", () => {
  const valid = { productId: product.id, quantity: 1 };
  for (const value of [[], [valid, valid], [{ ...valid, quantity: 0 }],
    [{ ...valid, quantity: 100 }], [{ ...valid, quantity: 1.5 }], [{ productId: "../secret", quantity: 1 }]]) {
    assert.throws(() => parseCheckoutLines(value));
  }
});

test("a quote rejects unlisted and out-of-stock products", () => {
  assert.throws(() => quoteCheckout([{ productId: "unlisted", quantity: 1 }], [product]));
  assert.throws(() => quoteCheckout([{ productId: product.id, quantity: 4 }], [{ ...product, stock: 3 }]));
});

test("idempotency identifier and replay cart must be well formed", () => {
  assert.equal(validCheckoutUuid("123e4567-e89b-42d3-a456-426614174000"), true);
  assert.equal(validCheckoutUuid("not-a-uuid"), false);
  assert.equal(sameStoredLines([{ productId: product.id, quantity: 2 }], [{ product_id: product.id, quantity: 2 }]), true);
  assert.equal(sameStoredLines([{ productId: product.id, quantity: 1 }], [{ product_id: product.id, quantity: 2 }]), false);
});

test("webhook HMAC verifies a fresh signature and rejects tampering/replay", () => {
  const secret = "test-secret";
  const ts = "1780000000";
  const requestId = "test-request";
  const dataId = "12345678";
  const digest = createHmac("sha256", secret).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest("hex");
  const args = { signature: `ts=${ts},v1=${digest}`, requestId, dataId, secret, nowMs: Number(ts) * 1000 };
  assert.equal(verifyCauceWebhookSignature(args), true);
  assert.equal(verifyCauceWebhookSignature({ ...args, dataId: "12345679" }), false);
  assert.equal(verifyCauceWebhookSignature({ ...args, secret: "forged" }), false);
  assert.equal(verifyCauceWebhookSignature({ ...args, nowMs: Number(ts) * 1000 + 600000 }), false);
  assert.equal(verifyCauceWebhookSignature({ ...args, signature: "broken" }), false);
});

test("only verified Checkout Pro URLs for the exact test preference are accepted", () => {
  const url = "https://www.mercadopago.com/mla/checkout/start?pref_id=12345";
  const regionalUrl = "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=12345";
  assert.equal(safeTestCheckoutUrl(url, "12345"), url);
  assert.equal(safeTestCheckoutUrl(regionalUrl, "12345"), regionalUrl);
  for (const bad of ["https://www.mercadopago.com.evil.tld/mla/checkout/start?pref_id=12345", "javascript:alert(1)",
    "https://mercadopago.com/mla/checkout/start?pref_id=12345", "http://www.mercadopago.com/mla/checkout/start?pref_id=12345",
    "https://sandbox.mercadopago.com/mla/checkout/pay?pref_id=12345",
    "https://www.mercadopago.com/mla/checkout/start?pref_id=another-pref",
    "https://www.mercadopago.com/mla/checkout/start?pref_id=12345&pref_id=12345",
    "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=another-pref",
    "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=12345&redirect=https://evil.tld",
    "https://www.mercadopago.com.ar.evil.tld/checkout/v1/redirect?pref_id=12345",
    "https://www.mercadopago.com/mla/checkout/start?pref_id=12345#fragment"]) {
    assert.throws(() => safeTestCheckoutUrl(bad, "12345"));
  }
});

test("protected preview webhook uses a project-scoped bypass in the URL, never the return URL", () => {
  const bypass = "test-isolated-preview-bypass-secret";
  const url = new URL(cauceProtectedWebhookUrl("https://cauce-retail-preview-genova.vercel.app", bypass));
  assert.equal(url.pathname, "/api/cauce/checkout/webhook");
  assert.equal(url.searchParams.get("x-vercel-protection-bypass"), bypass);
  assert.throws(() => cauceProtectedWebhookUrl("https://cauce-retail-preview-genova.vercel.app", undefined));
  assert.throws(() => cauceProtectedWebhookUrl("https://other.example.com", bypass));
});

test("provider confirmation must match order, amount, currency and TEST mode", () => {
  const expected = { paymentId: "1234", orderId: "123e4567-e89b-42d3-a456-426614174000", totalAmount: 65000 };
  const payment = { id: 1234, external_reference: expected.orderId, live_mode: false,
    currency_id: "ARS", transaction_amount: 65000, status: "approved" };
  assert.equal(validateCauceProviderPayment(payment, expected), "approved");
  for (const change of [
    { live_mode: true }, { currency_id: "USD" }, { transaction_amount: 64999 },
    { external_reference: "123e4567-e89b-42d3-a456-426614174001" }, { id: 5555 }, { status: "refunded" },
  ]) assert.throws(() => validateCauceProviderPayment({ ...payment, ...change }, expected));
});

test("sandbox checkout stays closed without explicitly isolated credentials", () => {
  const before = process.env.CAUCE_CHECKOUT_ENABLED;
  try { delete process.env.CAUCE_CHECKOUT_ENABLED; assert.equal(cauceSandboxCheckoutEnabled(), false); }
  finally { if (before === undefined) delete process.env.CAUCE_CHECKOUT_ENABLED; else process.env.CAUCE_CHECKOUT_ENABLED = before; }
});

test("APP_USR alone is insufficient: provider must confirm the exact test seller", () => {
  const good = { id: 1234567890, tags: ["test_user"], site_id: "MLA" };
  assert.equal(isVerifiedCauceTestSeller(good, "1234567890"), true);
  for (const bad of [
    { ...good, id: 9876543210 }, { ...good, tags: [] },
    { ...good, site_id: "MLB" }, { id: 1234567890, tags: "test_user" }, null,
  ]) assert.equal(isVerifiedCauceTestSeller(bad, "1234567890"), false);
});

test("expired orders are shown as expired, never falsely confirmed paid", () => {
  const expires_at = "2026-11-22T10:00:00.000Z";
  assert.equal(visibleCauceOrderStatus({ status: "pending", expires_at }, Date.parse(expires_at) - 1), "pending");
  assert.equal(visibleCauceOrderStatus({ status: "pending", expires_at }, Date.parse(expires_at)), "expired_test");
  assert.equal(visibleCauceOrderStatus({ status: "paid_test", expires_at }, Date.parse(expires_at) + 1), "paid_test");
});

test("a live seller identity stops Mercado Pago before creating a preference", async () => {
  const beforeEnv = Object.fromEntries(["CAUCE_MERCADOPAGO_TEST_ACCESS_TOKEN", "CAUCE_MERCADOPAGO_TEST_SELLER_ID", "VERCEL_AUTOMATION_BYPASS_SECRET"].map(k => [k, process.env[k]]));
  const oldFetch = globalThis.fetch;
  const calls: string[] = [];
  try {
    process.env.CAUCE_MERCADOPAGO_TEST_ACCESS_TOKEN = "APP_USR-exampletoken123456789";
    process.env.CAUCE_MERCADOPAGO_TEST_SELLER_ID = "1234567890";
    process.env.VERCEL_AUTOMATION_BYPASS_SECRET = "test-isolated-preview-bypass-secret";
    globalThis.fetch = async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return Response.json({ id: 1234567890, tags: [], site_id: "MLA" });
    };
    await assert.rejects(createCaucePreference({
      orderId: "123e4567-e89b-42d3-a456-426614174000", requestKey: "123e4567-e89b-42d3-a456-426614174001",
      expiresAt: "2026-11-22T10:00:00Z", origin: "https://preview.vercel.app",
      items: [{ productId: product.id, name: product.name, quantity: 1, unitPrice: product.price }],
    }), /no corresponde al vendedor de prueba/);
    assert.deepEqual(calls, ["https://api.mercadolibre.com/users/me"]);
  } finally {
    globalThis.fetch = oldFetch;
    for (const [name, value] of Object.entries(beforeEnv)) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});

test("verified test seller permits Checkout Pro URLs only for its own preference", async () => {
  const beforeEnv = Object.fromEntries(["CAUCE_MERCADOPAGO_TEST_ACCESS_TOKEN", "CAUCE_MERCADOPAGO_TEST_SELLER_ID", "VERCEL_AUTOMATION_BYPASS_SECRET"].map(k => [k, process.env[k]]));
  const oldFetch = globalThis.fetch;
  const calls: string[] = [];
  const id = "1234567890-12345-67890-abcde";
  try {
    process.env.CAUCE_MERCADOPAGO_TEST_ACCESS_TOKEN = "APP_USR-exampletoken123456789";
    process.env.CAUCE_MERCADOPAGO_TEST_SELLER_ID = "1234567890";
    process.env.VERCEL_AUTOMATION_BYPASS_SECRET = "test-isolated-preview-bypass-secret";
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push(String(input));
      if (String(input).endsWith("/users/me")) return Response.json({ id: 1234567890, tags: ["test_user"], site_id: "MLA" });
      if (String(input).endsWith("/checkout/preferences") && init?.body) {
        const preference = JSON.parse(String(init.body));
        const notify = new URL(preference.notification_url);
        assert.equal(notify.searchParams.get("x-vercel-protection-bypass"), "test-isolated-preview-bypass-secret");
        assert.equal(preference.back_urls.success.includes("x-vercel-protection-bypass"), false);
      }
      return Response.json({ id, collector_id: 1234567890,
        init_point: `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${id}` });
    };
    const result = await createCaucePreference({
      orderId: "123e4567-e89b-42d3-a456-426614174000", requestKey: "123e4567-e89b-42d3-a456-426614174001",
      expiresAt: "2026-11-22T10:00:00Z", origin: "https://preview.vercel.app",
      items: [{ productId: product.id, name: product.name, quantity: 1, unitPrice: product.price }],
    });
    assert.equal(result.id, id);
    assert.equal(result.url, `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${id}`);
    assert.equal(await getCaucePreference(id), result.url);
    assert.deepEqual(calls, [
      "https://api.mercadolibre.com/users/me", "https://api.mercadopago.com/checkout/preferences",
      "https://api.mercadolibre.com/users/me", `https://api.mercadopago.com/checkout/preferences/${id}`,
    ]);
  } finally {
    globalThis.fetch = oldFetch;
    for (const [name, value] of Object.entries(beforeEnv)) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});
