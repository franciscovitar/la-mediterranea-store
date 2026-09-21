import assert from "node:assert/strict";
import test from "node:test";
import { CheckoutValidationError, quoteCheckout } from "../lib/commerce/checkout";

test("checkout recalculates prices from the server catalog", () => {
  const quote = quoteCheckout([{ productId: "botella", quantity: 2, price: 1 }]);
  assert.equal(quote.total, 44000);
  assert.equal(quote.lines[0]?.unitPrice, 22000);
});

test("checkout merges duplicate variant lines", () => {
  const quote = quoteCheckout([
    { productId: "botella", quantity: 1 },
    { productId: "botella", quantity: 2 },
  ]);
  assert.equal(quote.lines.length, 1);
  assert.equal(quote.lines[0]?.quantity, 3);
  assert.equal(quote.total, 66000);
});

test("checkout rejects an invalid size", () => {
  assert.throws(
    () => quoteCheckout([{ productId: "remera_algodon", size: "XXXL", colorKey: "beige", quantity: 1 }]),
    CheckoutValidationError,
  );
});

import { checkoutFingerprint, readStoredCheckoutRequest } from "../lib/commerce/idempotency";

test("checkout fingerprint is stable across line ordering", () => {
  const a = checkoutFingerprint([
    { productId: "b", quantity: 1 },
    { productId: "a", colorKey: "x", size: "M", quantity: 2 },
  ], " USER@MAIL.COM ");
  const b = checkoutFingerprint([
    { productId: "a", colorKey: "x", size: "M", quantity: 2 },
    { productId: "b", quantity: 1 },
  ], "user@mail.com");
  assert.equal(a, b);
});

test("legacy bare checkout ids are treated as stale", () => {
  assert.equal(readStoredCheckoutRequest("123e4567-e89b-12d3-a456-426614174000"), null);
});
