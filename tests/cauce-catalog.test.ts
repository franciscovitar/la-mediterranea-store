import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { cauceProducts, filterCauceProducts, findCauceProduct } from "../lib/cauce/catalog";
import { reconcileCart } from "../lib/commerce/cart";

test("Cauce has twelve unique active products with independent generated assets", () => {
  assert.equal(cauceProducts.length, 12);
  assert.equal(new Set(cauceProducts.map((p) => p.slug)).size, cauceProducts.length);
  assert.equal(new Set(cauceProducts.map((p) => p.id)).size, cauceProducts.length);
  for (const product of cauceProducts) {
    assert.equal(product.active, true);
    assert.ok(product.slug && product.description && product.material && product.care);
    assert.ok(product.price > 0);
    assert.match(product.image, /^\/cauce\/catalog-[ab]-\d{2}\.webp$/);
    assert.ok(existsSync(join(process.cwd(), "public", product.image)), product.image);
    assert.equal(findCauceProduct(product.slug)?.id, product.id);
  }
});

test("Catalog search is accent-insensitive and also covers materials", () => {
  assert.ok(filterCauceProducts({ query: "CERAMICA" }).some((p) => p.id === "taza-bruma"));
  assert.ok(filterCauceProducts({ query: "deCORACION" }).some((p) => p.id === "jarron-tierra"));
  assert.equal(filterCauceProducts({ query: "nombre inexistente" }).length, 0);
});

test("Catalog category, price sort and search compose", () => {
  const products = filterCauceProducts({ category: "Mesa", sort: "precio-asc" });
  assert.ok(products.length >= 3);
  assert.ok(products.every((p) => p.category === "Mesa"));
  assert.deepEqual(products.map((p) => p.price), products.map((p) => p.price).sort((a, b) => a - b));
  assert.equal(filterCauceProducts({ category: "Mesa", query: "bandeja" }).length, 1);
});

test("A stale legacy product cart cannot enter the new Cauce basket", () => {
  const lines = reconcileCart([{ key: "taza_mediterranea||", productId: "taza_mediterranea", quantity: 5, price: 1 }], cauceProducts);
  assert.deepEqual(lines, []);
});

test("Restored Cauce cart uses current canonical names and prices", () => {
  const lines = reconcileCart([{ productId: "taza-bruma", quantity: 2, price: 1, name: "client text" }], cauceProducts);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].name, "Taza Bruma");
  assert.equal(lines[0].price, 32500);
});
