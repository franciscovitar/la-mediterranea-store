import { reconcileCart, type CartLine } from "@/lib/commerce/cart";
import type { CauceProduct } from "@/lib/cauce/catalog";

export function reconcileCauceCart(raw: unknown, products: CauceProduct[]): CartLine[] {
  const byId = new Map(products.map((product) => [product.id, product]));
  return reconcileCart(raw, products).map((line) => {
    const stock = byId.get(line.productId)?.stock;
    return { ...line, quantity: stock === undefined ? line.quantity : Math.min(line.quantity, stock) };
  }).filter((line) => line.quantity > 0);
}
