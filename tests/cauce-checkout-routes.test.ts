import assert from "node:assert/strict";
import test from "node:test";
import { POST as quote } from "../app/api/cauce/checkout/quote/route";
import { POST as create } from "../app/api/cauce/checkout/create/route";
import { POST as webhook } from "../app/api/cauce/checkout/webhook/route";
import { POST as reconcile } from "../app/api/cauce/checkout/reconcile/route";
import { GET as status } from "../app/api/cauce/checkout/status/route";
import { cauceProducts } from "../lib/cauce/catalog";
import { cauceSandboxCheckoutEnabled, cauceSandboxPaymentProcessingConfigured } from "../lib/cauce/config";
import { getCaucePaymentByOrderReference, isCauceOfficialTestCard, oneCauceSearchPaymentId, validateCauceProviderPayment } from "../lib/cauce/payments";

const origin = "http://localhost:3000";
const validLines = [{ productId: cauceProducts[0].id, quantity: 2, price: 1 }];

function post(path: string, body: unknown, from = origin) {
  return new Request(`${origin}${path}`, { method: "POST", body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", Origin: from, Host: "localhost:3000" } });
}

test("Cauce quote ignores forged browser price and returns server price", async () => {
  const response = await quote(post("/api/cauce/checkout/quote", { lines: validLines }));
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.total, cauceProducts[0].price * 2);
  assert.equal(result.sandboxEnabled, false);
});

test("quote blocks forged origins and invalid line input", async () => {
  assert.equal((await quote(post("/api/cauce/checkout/quote", { lines: validLines }, "https://bad.invalid"))).status, 403);
  assert.equal((await quote(post("/api/cauce/checkout/quote", { lines: [] }))).status, 400);
});

test("creation and webhook fail closed before credentials exist", async () => {
  const response = await create(post("/api/cauce/checkout/create", {
    lines: validLines, requestKey: "123e4567-e89b-42d3-a456-426614174000",
  }));
  assert.equal(response.status, 503);
  assert.equal((await webhook(post("/api/cauce/checkout/webhook?type=payment&data.id=1234", {}))).status, 503);
  assert.equal((await reconcile(post("/api/cauce/checkout/reconcile", {}))).status, 503);
});

test("pausing new test purchases keeps signed payment handling available", async () => {
  const values = {
    CAUCE_CATALOG_SOURCE: "database",
    CAUCE_CHECKOUT_ENABLED: "false",
    CAUCE_SUPABASE_SECRET_KEY: "synthetic-supabase-secret",
    CAUCE_MERCADOPAGO_TEST_ACCESS_TOKEN: "APP_USR-synthetic-test-token",
    CAUCE_MERCADOPAGO_TEST_SELLER_ID: "1765413554",
    CAUCE_MERCADOPAGO_WEBHOOK_SECRET: "synthetic-signature-secret",
    VERCEL_AUTOMATION_BYPASS_SECRET: "synthetic-preview-bypass-key-123",
    CAUCE_CHECKOUT_ORIGIN: "https://cauce-retail-preview-genova.vercel.app",
  };
  const before = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  try {
    Object.assign(process.env, values);
    assert.equal(cauceSandboxCheckoutEnabled(), false);
    assert.equal(cauceSandboxPaymentProcessingConfigured(), true);
    assert.equal((await create(post("/api/cauce/checkout/create", {
      lines: validLines, requestKey: "123e4567-e89b-42d3-a456-426614174000",
    }))).status, 503);
    assert.equal((await webhook(post("/api/cauce/checkout/webhook?type=payment&data.id=123456", {}))).status, 401);
    assert.equal((await reconcile(post("/api/cauce/checkout/reconcile", {}))).status, 400);
  } finally {
    for (const [key, value] of Object.entries(before)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("reconciliation refuses cross-origin requests and forged payment identifiers", async () => {
  assert.equal((await reconcile(post("/api/cauce/checkout/reconcile", {}, "https://evil.invalid"))).status, 403);
  assert.equal((await reconcile(post("/api/cauce/checkout/reconcile", {
    orderId: "123e4567-e89b-42d3-a456-426614174000",
    requestKey: "123e4567-e89b-42d3-a456-426614174000", paymentId: "123;DROP TABLE",
  }))).status, 503);
});

test("status requires an unguessable pair of UUIDs", async () => {
  const response = await status(new Request(`${origin}/api/cauce/checkout/status?order=not-valid&key=nope`));
  assert.equal(response.status, 400);
});

test("Checkout Pro accepts live_mode=true only with a matching official test card and seller", () => {
  const payment = {
    id: 191136243454, external_reference: "123e4567-e89b-42d3-a456-426614174000",
    collector_id: 1765413554, live_mode: true, currency_id: "ARS",
    transaction_amount: 28500, status: "approved", payment_method_id: "visa",
    card: { first_six_digits: "450995", last_four_digits: "3704" },
  };
  const expected = { paymentId: "191136243454", orderId: payment.external_reference,
    totalAmount: 28500, sellerId: "1765413554" };
  assert.equal(isCauceOfficialTestCard(payment), true);
  assert.equal(validateCauceProviderPayment(payment, expected), "approved");
  assert.equal(validateCauceProviderPayment({ ...payment, live_mode: false }, expected), "approved");
  assert.throws(() => validateCauceProviderPayment({ ...payment, live_mode: undefined }, expected));
  assert.throws(() => validateCauceProviderPayment({ ...payment, collector_id: 999 }, expected));
  assert.throws(() => validateCauceProviderPayment({ ...payment, transaction_amount: 1 }, expected));
  assert.throws(() => validateCauceProviderPayment({ ...payment, card: { first_six_digits: "450995", last_four_digits: "9999" } }, expected));
});

test("search result without a payment is pending, but multiple payments require manual review", () => {
  assert.equal(oneCauceSearchPaymentId({ paging: { total: 0 }, results: [] }), null);
  assert.equal(oneCauceSearchPaymentId({ paging: { total: 1 }, results: [{ id: 191136243454 }] }), "191136243454");
  for (const bad of [
    { paging: { total: 2 }, results: [{ id: 1 }, { id: 2 }] },
    { paging: { total: 2 }, results: [{ id: 1 }] },
    { paging: { total: 1 }, results: [{ id: "1;drop" }] },
    { paging: { total: 0 }, results: [{ id: 1 }] },
    { results: [] },
    null,
  ]) assert.throws(() => oneCauceSearchPaymentId(bad));
});

test("missing payment ID resolves via test seller and exact order reference, without trusting a search result as a payment", async () => {
  const orderId = "123e4567-e89b-42d3-a456-426614174000";
  const originalFetch = globalThis.fetch;
  const token = process.env.CAUCE_MERCADOPAGO_TEST_ACCESS_TOKEN;
  const seller = process.env.CAUCE_MERCADOPAGO_TEST_SELLER_ID;
  const seen: string[] = [];
  try {
    process.env.CAUCE_MERCADOPAGO_TEST_ACCESS_TOKEN = "APP_USR-synthetic-test-token";
    process.env.CAUCE_MERCADOPAGO_TEST_SELLER_ID = "1765413554";
    globalThis.fetch = async (input) => {
      const url = String(input);
      seen.push(url);
      if (url === "https://api.mercadolibre.com/users/me") {
        return Response.json({ id: 1765413554, tags: ["test_user"], site_id: "MLA" });
      }
      if (url.includes("/v1/payments/search?")) {
        assert.equal(new URL(url).searchParams.get("external_reference"), orderId);
        return Response.json({ paging: { total: 1 }, results: [{ id: 191136243454 }] });
      }
      if (url.endsWith("/v1/payments/191136243454")) {
        return Response.json({ id: 191136243454, status: "pending" });
      }
      throw Error("Unexpected provider call");
    };
    const result = await getCaucePaymentByOrderReference(orderId);
    assert.equal(result?.id, "191136243454");
    assert.equal(result?.payment.status, "pending");
    assert.equal(seen.filter((url) => url.includes("/users/me")).length, 2);
    assert.equal(seen.filter((url) => url.includes("/v1/payments/")).length, 2);
  } finally {
    globalThis.fetch = originalFetch;
    if (token === undefined) delete process.env.CAUCE_MERCADOPAGO_TEST_ACCESS_TOKEN;
    else process.env.CAUCE_MERCADOPAGO_TEST_ACCESS_TOKEN = token;
    if (seller === undefined) delete process.env.CAUCE_MERCADOPAGO_TEST_SELLER_ID;
    else process.env.CAUCE_MERCADOPAGO_TEST_SELLER_ID = seller;
  }
});
