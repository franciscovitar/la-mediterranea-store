import type { Product } from "@/lib/products";
import type { DraftInventory } from "@/lib/admin/draft";

function sqlString(value: string) {
  return "'" + value.replace(/'/g, "''") + "'";
}

function sqlNullable(value?: string) {
  return value ? sqlString(value) : "null";
}

function productIds(products: Product[]) {
  return products.map((product) => sqlString(product.id)).join(", ");
}

export function buildAdminBackup(products: Product[], inventory: DraftInventory) {
  return JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    products,
    inventory,
  }, null, 2);
}

export function buildSupabaseDraftSql(products: Product[], inventory: DraftInventory) {
  if (!products.length) throw new Error("No hay productos para exportar.");

  const lines: string[] = [
    "-- La Mediterránea - import inicial generado desde /admin",
    "-- Revisar antes de aplicar. Está pensado para la carga inicial de Supabase.",
    "begin;",
    "",
  ];

  const productRows = products.map((product) =>
    [
      "(",
      [
        sqlString(product.id),
        sqlString(product.category),
        sqlString(product.name),
        product.price.toFixed(2),
        sqlString(product.description),
        sqlString(product.image),
        sqlNullable(product.note),
        product.active ? "true" : "false",
      ].join(", "),
      ")",
    ].join("")
  );

  lines.push(
    "insert into public.products (id, category, name, price, description, image, note, active) values",
    productRows.join(",\n"),
    "on conflict (id) do update set",
    "  category = excluded.category,",
    "  name = excluded.name,",
    "  price = excluded.price,",
    "  description = excluded.description,",
    "  image = excluded.image,",
    "  note = excluded.note,",
    "  active = excluded.active;",
    "",
  );

  const ids = productIds(products);
  lines.push(
    "delete from public.product_colors where product_id in (" + ids + ");",
    "delete from public.product_sizes where product_id in (" + ids + ");",
    "delete from public.inventory where product_id in (" + ids + ");",
    "",
  );

  const colors = products.flatMap((product) =>
    (product.colors ?? []).map((color, index) => [
      sqlString(product.id),
      sqlString(color.key),
      sqlString(color.label),
      sqlString(color.swatch),
      sqlString(color.image),
      String(index + 1),
    ])
  );
  if (colors.length) {
    lines.push(
      "insert into public.product_colors (product_id, key, label, swatch, image, sort_order) values",
      colors.map((row) => "(" + row.join(", ") + ")").join(",\n") + ";",
      "",
    );
  }

  const sizes = products.flatMap((product) =>
    (product.sizes ?? []).map((size, index) => [
      sqlString(product.id),
      sqlString(size),
      String(index + 1),
    ])
  );
  if (sizes.length) {
    lines.push(
      "insert into public.product_sizes (product_id, size, sort_order) values",
      sizes.map((row) => "(" + row.join(", ") + ")").join(",\n") + ";",
      "",
    );
  }

  const inventoryRows = Object.entries(inventory)
    .filter(([, entry]) => entry.tracked)
    .map(([key, entry]) => {
      const [productId, colorKey = "", size = ""] = key.split("|");
      return [
        sqlString(productId),
        sqlString(colorKey),
        sqlString(size),
        String(Math.max(0, Math.trunc(entry.stock))),
      ];
    });

  if (inventoryRows.length) {
    lines.push(
      "insert into public.inventory (product_id, color_key, size, stock) values",
      inventoryRows.map((row) => "(" + row.join(", ") + ")").join(",\n"),
      "on conflict (product_id, color_key, size) do update set stock = excluded.stock;",
      "",
    );
  }

  lines.push("commit;", "");
  return lines.join("\n");
}
