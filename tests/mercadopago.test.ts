import assert from "node:assert/strict";
import test from "node:test";
import { buildMercadoPagoItems, buildMercadoPagoReturnUrls } from "../lib/integrations/mercadopago/server";

test("Mercado Pago receives one server-authoritative item per stored order line", () => {
  const items = buildMercadoPagoItems([
    { title: "Tote bag", quantity: 2, unitPrice: 12000 },
    { title: "Taza Mediterránea", quantity: 1, unitPrice: 20000 },
  ]);
  assert.deepEqual(items, [
    { title: "Tote bag", quantity: 2, unit_price: "12000.00" },
    { title: "Taza Mediterránea", quantity: 1, unit_price: "20000.00" },
  ]);
});

test("Mercado Pago return URLs keep the local order reference", () => {
  const urls = buildMercadoPagoReturnUrls("https://tienda.example", "123e4567-e89b-12d3-a456-426614174000");
  assert.equal(urls.success, "https://tienda.example/checkout/success?order_id=123e4567-e89b-12d3-a456-426614174000");
  assert.equal(urls.failure, "https://tienda.example/checkout/failure?order_id=123e4567-e89b-12d3-a456-426614174000");
  assert.equal(urls.pending, "https://tienda.example/checkout/pending?order_id=123e4567-e89b-12d3-a456-426614174000");
});
