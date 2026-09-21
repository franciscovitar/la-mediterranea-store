import type { Product, ProductColor } from "@/lib/products";

export const ADMIN_PRODUCTS_STORAGE_KEY = "la-mediterranea-admin-products-v1";
export const ADMIN_INVENTORY_STORAGE_KEY = "la-mediterranea-admin-inventory-v1";
export const ADMIN_PREVIEW_CART_STORAGE_KEY = "la-mediterranea-admin-preview-cart-v1";

export type DraftInventoryEntry = {
  tracked: boolean;
  stock: number;
};

export type DraftInventory = Record<string, DraftInventoryEntry>;

export type InventoryVariant = {
  key: string;
  productId: string;
  productName: string;
  variantLabel: string;
};

export function cloneProducts(products: Product[]): Product[] {
  return products.map((product) => ({
    ...product,
    colors: product.colors?.map((color) => ({ ...color })),
    sizes: product.sizes ? [...product.sizes] : undefined,
  }));
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function readText(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Falta " + field + " en uno de los productos.");
  }
  return value.trim();
}

function readOptionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readColor(value: unknown, fallbackImage: string): ProductColor {
  if (!value || typeof value !== "object") throw new Error("Hay un color inválido.");
  const row = value as Record<string, unknown>;
  return {
    key: readText(row.key, "la clave del color"),
    label: readText(row.label, "el nombre del color"),
    swatch: readOptionalText(row.swatch) ?? "#d9d0c5",
    image: readOptionalText(row.image) ?? fallbackImage,
  };
}

export function validateDraftProducts(value: unknown): Product[] {
  if (!Array.isArray(value)) throw new Error("El archivo debe contener una lista de productos.");

  const products = value.map((raw) => {
    if (!raw || typeof raw !== "object") throw new Error("Hay un producto inválido.");
    const row = raw as Record<string, unknown>;
    const image = readText(row.image, "la imagen");
    const price = Number(row.price);
    if (!Number.isFinite(price) || price < 0) throw new Error("Hay un precio inválido.");

    const colors = Array.isArray(row.colors) && row.colors.length
      ? row.colors.map((color) => readColor(color, image))
      : undefined;
    const sizes = Array.isArray(row.sizes)
      ? row.sizes.filter((size): size is string => typeof size === "string" && Boolean(size.trim())).map((size) => size.trim())
      : undefined;

    return {
      id: readText(row.id, "el ID"),
      category: readText(row.category, "la categoría"),
      name: readText(row.name, "el nombre"),
      price,
      description: typeof row.description === "string" ? row.description.trim() : "",
      image,
      note: readOptionalText(row.note),
      colors,
      sizes: sizes?.length ? sizes : undefined,
      active: typeof row.active === "boolean" ? row.active : true,
    } satisfies Product;
  });

  const ids = new Set<string>();
  for (const product of products) {
    if (ids.has(product.id)) throw new Error("Hay IDs de producto repetidos: " + product.id);
    ids.add(product.id);
  }

  return products;
}

export function inventoryVariants(products: Product[]): InventoryVariant[] {
  const rows: InventoryVariant[] = [];

  for (const product of products) {
    const colors = product.colors?.length
      ? product.colors.map((color) => ({ key: color.key, label: color.label }))
      : [{ key: "", label: "" }];
    const sizes = product.sizes?.length ? product.sizes : [""];

    for (const color of colors) {
      for (const size of sizes) {
        const pieces = [
          color.label || null,
          size ? "Talle " + size : null,
        ].filter(Boolean);

        rows.push({
          key: [product.id, color.key, size].join("|"),
          productId: product.id,
          productName: product.name,
          variantLabel: pieces.join(" · ") || "Producto base",
        });
      }
    }
  }

  return rows;
}
