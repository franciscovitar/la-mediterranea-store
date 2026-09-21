import type { Product } from "@/lib/products";

export const CART_STORAGE_KEY = "la-mediterranea-cart-v1";
export const CHECKOUT_REQUEST_STORAGE_KEY = "la-mediterranea-checkout-request-v1";

export type CartLine = {
  key: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  colorKey?: string;
  colorLabel?: string;
  size?: string;
};

function optionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function reconcileCart(value: unknown, catalog: Product[]): CartLine[] {
  if (!Array.isArray(value)) return [];

  const products = new Map(
    catalog.filter((product) => product.active).map((product) => [product.id, product]),
  );
  const merged = new Map<string, CartLine>();

  for (const raw of value) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const row = raw as Record<string, unknown>;
    const productId = optionalText(row.productId);
    const quantity = Number(row.quantity);
    if (!productId || !Number.isInteger(quantity) || quantity < 1) continue;

    const product = products.get(productId);
    if (!product) continue;

    const storedColorKey = optionalText(row.colorKey);
    const storedColorLabel = optionalText(row.colorLabel);
    const color = product.colors?.find((candidate) =>
      candidate.key === storedColorKey || (!storedColorKey && candidate.label === storedColorLabel)
    );

    if (product.colors?.length && !color) continue;
    if (!product.colors?.length && (storedColorKey || storedColorLabel)) continue;

    const storedSize = optionalText(row.size);
    if (product.sizes?.length && (!storedSize || !product.sizes.includes(storedSize))) continue;
    if (!product.sizes?.length && storedSize) continue;

    const key = [product.id, color?.key ?? "", storedSize ?? ""].join("|");
    const normalized: CartLine = {
      key,
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: Math.min(99, quantity),
      image: color?.image ?? product.image,
      colorKey: color?.key,
      colorLabel: color?.label,
      size: storedSize,
    };

    const existing = merged.get(key);
    if (existing) {
      existing.quantity = Math.min(99, existing.quantity + normalized.quantity);
    } else {
      merged.set(key, normalized);
    }
  }

  return Array.from(merged.values());
}
