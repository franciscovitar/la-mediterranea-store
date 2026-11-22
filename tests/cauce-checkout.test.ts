import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "node:crypto";
import { cauceProducts } from "../lib/cauce/catalog";
import { parseCheckoutLines, quoteCheckout, validCheckoutUuid } from "../lib/cauce/checkout";
import { safeSandboxUrl, validateCauceProviderPayment, verifyCauceWebhookSignature } from "../lib/cauce/payments";
import { sameStoredLines } from "../lib/cauce/order-store";
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

test("only the exact Mercado Pago sandbox host is accepted", () => {
  const url = "https://sandbox.mercadopago.com/mla/checkout/pay?pref_id=123";
  assert.equal(safeSandboxUrl(url), url);
  for (const bad of ["https://sandbox.mercadopago.com.evil.tld/mla/checkout/pay", "javascript:alert(1)",
    "https://mercadopago.com/mla/checkout/pay", "http://sandbox.mercadopago.com/mla/checkout/pay"]) {
    assert.throws(() => safeSandboxUrl(bad));
  }
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
