import assert from "node:assert/strict";
import test from "node:test";
import { CheckoutValidationError, quoteCheckout, quoteCheckoutFromCatalog } from "../lib/commerce/checkout";

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

test("checkout uses the supplied canonical catalog rather than browser prices", () => {
  const quote = quoteCheckoutFromCatalog([{
    productId: "real", quantity: 2, price: 1,
  }], [{ id: "real", category: "A", name: "Real", price: 3456, description: "", image: "/real.jpg", active: true }]);
  assert.equal(quote.total, 6912);
});

test("checkout rejects products made inactive in the canonical catalog", () => {
  assert.throws(() => quoteCheckoutFromCatalog(
    [{ productId: "hidden", quantity: 1 }],
    [{ id: "hidden", category: "A", name: "Hidden", price: 1, description: "", image: "/hidden.jpg", active: false }],
  ), CheckoutValidationError);
});

import { checkoutFingerprint, readStoredCheckoutRequest } from "../lib/commerce/idempotency";

test("checkout fingerprint is stable across line ordering", () => {
  const a = checkoutFingerprint([
    { productId: "b", quantity: 1 },
    { productId: "a", colorKey: "x", size: "M", quantity: 2 },
  ], { buyerName: " María José Pérez ", buyerPhone: " 351 5551234 ", buyerEmail: " USER@MAIL.COM ", fulfillmentMethod: "pickup" });
  const b = checkoutFingerprint([
    { productId: "a", colorKey: "x", size: "M", quantity: 2 },
    { productId: "b", quantity: 1 },
  ], { buyerName: "María José Pérez", buyerPhone: "351 5551234", buyerEmail: "user@mail.com", fulfillmentMethod: "pickup" });
  assert.equal(a, b);
});

test("legacy bare checkout ids are treated as stale", () => {
  assert.equal(readStoredCheckoutRequest("123e4567-e89b-12d3-a456-426614174000"), null);
});

import { reconcileCart } from "../lib/commerce/cart";
import { products } from "../lib/products";

test("saved cart is reconciled to current catalog prices and names", () => {
  const reconciled = reconcileCart([{
    key: "stale",
    productId: "botella",
    name: "Nombre viejo",
    price: 1,
    quantity: 2,
    image: "/old.jpg",
  }], products);
  assert.equal(reconciled.length, 1);
  assert.equal(reconciled[0]?.name, "Botella de aluminio");
  assert.equal(reconciled[0]?.price, 22000);
  assert.equal(reconciled[0]?.quantity, 2);
});

test("saved cart drops products or variants that no longer exist", () => {
  const reconciled = reconcileCart([
    { productId: "no_existe", quantity: 1 },
    { productId: "remera_algodon", colorKey: "invalido", size: "M", quantity: 1 },
  ], products);
  assert.deepEqual(reconciled, []);
});


import { BuyerValidationError, normalizeBuyerDetails } from "../lib/commerce/buyer";

test("buyer details normalize the real checkout fields", () => {
  const buyer = normalizeBuyerDetails({
    buyerName: "  María   José Pérez ",
    buyerPhone: " 351 555-1234 ",
    buyerEmail: " USER@MAIL.COM ",
    buyerNotes: " retirar el finde ",
    fulfillmentMethod: "pickup",
  });
  assert.deepEqual(buyer, {
    buyerName: "María José Pérez",
    buyerPhone: "351 555-1234",
    buyerEmail: "user@mail.com",
    buyerNotes: "retirar el finde",
    fulfillmentMethod: "pickup",
  });
});

test("buyer name, phone, email and fulfillment method are required", () => {
  assert.throws(() => normalizeBuyerDetails({
    buyerName: "",
    buyerPhone: "3515551234",
    buyerEmail: "maria@example.com",
    fulfillmentMethod: "pickup",
  }), BuyerValidationError);
  assert.throws(() => normalizeBuyerDetails({
    buyerName: "María Pérez",
    buyerPhone: "123",
    fulfillmentMethod: "pickup",
  }), BuyerValidationError);
  assert.throws(() => normalizeBuyerDetails({
    buyerName: "María Pérez",
    buyerPhone: "3515551234",
    fulfillmentMethod: "pickup",
  }), BuyerValidationError);
  assert.throws(() => normalizeBuyerDetails({
    buyerName: "María Pérez",
    buyerPhone: "3515551234",
    buyerEmail: "maria@example.com",
    fulfillmentMethod: "courier",
  }), BuyerValidationError);
});

test("checkout fingerprint changes when operational buyer data changes", () => {
  const lines = [{ productId: "botella", quantity: 1 }];
  const pickup = checkoutFingerprint(lines, {
    buyerName: "María Pérez",
    buyerPhone: "3515551234",
    buyerEmail: "maria@example.com",
    fulfillmentMethod: "pickup",
  });
  const delivery = checkoutFingerprint(lines, {
    buyerName: "María Pérez",
    buyerPhone: "3515551234",
    buyerEmail: "maria@example.com",
    fulfillmentMethod: "delivery",
  });
  assert.notEqual(pickup, delivery);
});
