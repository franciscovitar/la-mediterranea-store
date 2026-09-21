import type { Product } from "@/lib/products";
import { validateDraftProducts, type DraftInventory } from "@/lib/admin/draft";

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


export function parseAdminBackup(value: unknown): {
  products: Product[];
  inventory: DraftInventory;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("El respaldo no tiene un formato válido.");
  }

  const row = value as Record<string, unknown>;
  if (row.version !== 1) {
    throw new Error("La versión del respaldo no es compatible.");
  }

  const products = validateDraftProducts(row.products);
  if (!row.inventory || typeof row.inventory !== "object" || Array.isArray(row.inventory)) {
    throw new Error("El stock del respaldo no tiene un formato válido.");
  }

  const validProductIds = new Set(products.map((product) => product.id));
  const inventory: DraftInventory = {};

  for (const [key, raw] of Object.entries(row.inventory as Record<string, unknown>)) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new Error("Hay una fila de stock inválida en el respaldo.");
    }

    const entry = raw as Record<string, unknown>;
    if (typeof entry.tracked !== "boolean") {
      throw new Error("Hay una fila de stock sin estado de control válido.");
    }

    const stock = Number(entry.stock);
    if (!Number.isInteger(stock) || stock < 0) {
      throw new Error("Hay una cantidad de stock inválida.");
    }

    const [productId] = key.split("|");
    if (!validProductIds.has(productId)) continue;

    inventory[key] = { tracked: entry.tracked, stock };
  }

  return { products, inventory };
}
