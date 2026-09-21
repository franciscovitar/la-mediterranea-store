import assert from "node:assert/strict";
import test from "node:test";
import { inventoryVariants, slugify, validateDraftProducts } from "../lib/admin/draft";
import { buildAdminBackup, buildSupabaseDraftSql, parseAdminBackup } from "../lib/admin/export";

test("slugify keeps stable ascii product ids", () => {
  assert.equal(slugify("Remera Clásica Bordó"), "remera_clasica_bordo");
});

test("draft validator rejects duplicate ids", () => {
  assert.throws(() => validateDraftProducts([
    { id: "x", category: "A", name: "Uno", price: 1, description: "", image: "/x.jpg", active: true },
    { id: "x", category: "A", name: "Dos", price: 2, description: "", image: "/y.jpg", active: true },
  ]));
});

test("inventory expands color and size combinations", () => {
  const products = validateDraftProducts([{
    id: "x",
    category: "A",
    name: "Producto",
    price: 100,
    description: "",
    image: "/x.jpg",
    active: true,
    colors: [
      { key: "n", label: "Negro", swatch: "#000000", image: "/x.jpg" },
      { key: "b", label: "Blanco", swatch: "#ffffff", image: "/x.jpg" },
    ],
    sizes: ["S", "M"],
  }]);
  assert.equal(inventoryVariants(products).length, 4);
});

test("Supabase draft SQL escapes quotes and only inserts tracked inventory", () => {
  const products = validateDraftProducts([{
    id: "x",
    category: "A",
    name: "O'Hara",
    price: 100,
    description: "",
    image: "/x.jpg",
    active: true,
  }]);
  const sql = buildSupabaseDraftSql(products, {
    "x||": { tracked: true, stock: 3 },
    "ignored||": { tracked: false, stock: 9 },
  });
  assert.match(sql, /O''Hara/);
  assert.match(sql, /\('x', '', '', 3\)/);
  assert.doesNotMatch(sql, /ignored/);
});


test("admin backup round-trips products and tracked inventory", () => {
  const products = validateDraftProducts([{
    id: "x",
    category: "A",
    name: "Producto",
    price: 100,
    description: "",
    image: "/x.jpg",
    active: true,
  }]);
  const json = buildAdminBackup(products, {
    "x||": { tracked: true, stock: 4 },
    "fantasma||": { tracked: true, stock: 9 },
  });
  const restored = parseAdminBackup(JSON.parse(json));
  assert.equal(restored.products[0]?.id, "x");
  assert.deepEqual(restored.inventory, { "x||": { tracked: true, stock: 4 } });
});

test("admin backup rejects negative stock", () => {
  assert.throws(() => parseAdminBackup({
    version: 1,
    products: [{ id: "x", category: "A", name: "Producto", price: 100, description: "", image: "/x.jpg", active: true }],
    inventory: { "x||": { tracked: true, stock: -1 } },
  }));
});
