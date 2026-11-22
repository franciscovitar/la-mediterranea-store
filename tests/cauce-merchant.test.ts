import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { cauceProducts } from "../lib/cauce/catalog";
import { mapCauceRows } from "../lib/cauce/backend";
import { caucePublicConfig } from "../lib/cauce/config";
import { checkSameOrigin, validateCauceProduct, validateStockAdjustment } from "../lib/cauce/validation";
import { reconcileCauceCart } from "../lib/cauce/cart";

const product = { ...cauceProducts[0] };

test("new Cauce products use a strict stable slug and same-id rule", () => {
  assert.equal(validateCauceProduct(product).id, product.slug);
  assert.throws(() => validateCauceProduct({ ...product, slug: "../admin" }), /identificador/);
  assert.throws(() => validateCauceProduct({ ...product, image: "https://example.com/evil.png" }), /imagen local/);
  assert.throws(() => validateCauceProduct({ ...product, price: NaN }), /precio/);
  assert.throws(() => validateCauceProduct({ ...product, price: 900.5 }), /precio/);
  assert.throws(() => validateCauceProduct({ ...product, active: "true" }), /active/);
  assert.equal(validateCauceProduct({ ...product, badge: "" }).badge, null);
});

test("stock adjustments reject invalid inventory and version edits", () => {
  assert.deepEqual(validateStockAdjustment({ productId: product.id, expectedVersion: 4, stock: 6, reason: "Recuento" }),
    { productId: product.id, expectedVersion: 4, stock: 6, reason: "Recuento" });
  assert.throws(() => validateStockAdjustment({ productId: product.id, expectedVersion: -1, stock: 6, reason: "Recuento" }), /Stock/);
  assert.throws(() => validateStockAdjustment({ productId: product.id, expectedVersion: 4, stock: -1, reason: "Recuento" }), /Stock/);
  assert.throws(() => validateStockAdjustment({ productId: product.id, expectedVersion: 4, stock: 1, reason: "" }), /motivo/);
});

test("cross-origin writes and non-JSON requests are rejected", () => {
  const headers = { origin: "https://shop.example", "content-type": "application/json" };
  assert.doesNotThrow(() => checkSameOrigin(new Request("https://shop.example/api/cauce/merchant/products", { headers })));
  assert.throws(() => checkSameOrigin(new Request("https://shop.example/api/cauce/merchant/products", {
    headers: { ...headers, origin: "https://attacker.example" },
  })), /Origen/);
  assert.throws(() => checkSameOrigin(new Request("https://shop.example/api/cauce/merchant/products", {
    headers: { origin: "https://shop.example", "content-type": "text/plain" },
  })), /JSON/);
});

test("catalog maps server stock and treats absent stock as zero", () => {
  const mapped = mapCauceRows([product], [{ product_id: product.id, stock: 3, version: 1 }]);
  assert.equal(mapped[0].stock, 3);
  assert.equal(mapCauceRows([product], [])[0].stock, 0);
});

test("restored cart cannot exceed current server stock or retain unavailable product", () => {
  const line = [{ key: `${product.id}||`, productId: product.id, name: product.name, image: product.image, price: product.price, quantity: 20 }];
  assert.equal(reconcileCauceCart(line, [{ ...product, stock: 3 }])[0].quantity, 3);
  assert.equal(reconcileCauceCart(line, [{ ...product, stock: 0 }]).length, 0);
});

test("Cauce refuses to reuse the original merchant Supabase URL", () => {
  const original = {
    NEXT_PUBLIC_CAUCE_SUPABASE_URL: process.env.NEXT_PUBLIC_CAUCE_SUPABASE_URL,
    NEXT_PUBLIC_CAUCE_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CAUCE_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  };
  try {
    process.env.NEXT_PUBLIC_CAUCE_SUPABASE_URL = "https://example-demo.supabase.co";
    process.env.NEXT_PUBLIC_CAUCE_SUPABASE_PUBLISHABLE_KEY = "test_public";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example-demo.supabase.co";
    assert.throws(() => caucePublicConfig(), /reutilizar/);
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("SQL draft has scoped RLS, version guard and no guest order permissions", () => {
  const sql = readFileSync(new URL("../supabase/cauce/SCHEMA_M2_DRAFT.sql", import.meta.url), "utf8");
  for (const table of ["cauce_staff", "cauce_products", "cauce_inventory", "cauce_inventory_movements", "cauce_orders"]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(sql, /for update/);
  assert.match(sql, /before_row\.version <> p_expected_version/);
  assert.match(sql, /revoke all on function public\.cauce_set_stock/);
  assert.doesNotMatch(sql, /grant insert on public\.cauce_orders to anon/);
  assert.match(sql, /grant select on public\.cauce_inventory_movements to authenticated;/);
  assert.doesNotMatch(sql, /grant select on public\.cauce_inventory_movements to anon/);
});
