import type { CauceProduct } from "@/lib/cauce/catalog";

export class CauceCheckoutError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

/** Exact provider URL allowlist shared by the server and browser. Never use an arbitrary redirect. */
export function safeTestCheckoutUrl(value: unknown, expectedPreferenceId?: string) {
  if (typeof value !== "string") throw new CauceCheckoutError("Enlace de pago de prueba inválido.", 502);
  try {
    const url = new URL(value);
    const allowedRoute = (url.hostname === "www.mercadopago.com" && url.pathname === "/mla/checkout/start") ||
      (url.hostname === "www.mercadopago.com.ar" && url.pathname === "/checkout/v1/redirect");
    if (url.protocol !== "https:" || !allowedRoute || url.username || url.password ||
        url.port || url.hash || url.searchParams.size !== 1 || url.searchParams.getAll("pref_id").length !== 1 ||
        (expectedPreferenceId && url.searchParams.get("pref_id") !== expectedPreferenceId)) throw Error();
    return url.toString();
  } catch { throw new CauceCheckoutError("Enlace de pago de prueba inválido.", 502); }
}

export type CheckoutLine = { productId: string; quantity: number };
export type CheckoutQuoteItem = CheckoutLine & { name: string; unitPrice: number; amount: number };

const productPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const uuidPattern = /^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;

export function validCheckoutUuid(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

export function parseCheckoutLines(input: unknown): CheckoutLine[] {
  if (!Array.isArray(input) || input.length === 0 || input.length > 20) {
    throw new CauceCheckoutError("Seleccioná entre uno y veinte productos.");
  }
  const seen = new Set<string>();
  return input.map((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new CauceCheckoutError("Producto inválido.");
    const line = raw as Record<string, unknown>;
    if (typeof line.productId !== "string" || line.productId.length > 70 ||
        !productPattern.test(line.productId) || !Number.isInteger(line.quantity) ||
        (line.quantity as number) < 1 || (line.quantity as number) > 99 || seen.has(line.productId)) {
      throw new CauceCheckoutError("Identificador o cantidad inválidos.");
    }
    seen.add(line.productId);
    // Ignore forged prices/names from the browser: only these two fields cross the boundary.
    return { productId: line.productId, quantity: line.quantity as number };
  });
}

export function quoteCheckout(lines: CheckoutLine[], products: CauceProduct[]) {
  const byId = new Map(products.filter((p) => p.active).map((p) => [p.id, p]));
  let total = 0;
  const items: CheckoutQuoteItem[] = lines.map((line) => {
    const product = byId.get(line.productId);
    if (!product || !Number.isSafeInteger(product.price) || product.price <= 0) {
      throw new CauceCheckoutError("Uno de los productos ya no está disponible.", 409);
    }
    if (product.stock !== undefined && line.quantity > product.stock) {
      throw new CauceCheckoutError(`No hay stock suficiente de ${product.name}.`, 409);
    }
    const amount = product.price * line.quantity;
    total += amount;
    if (!Number.isSafeInteger(total) || total > 1_000_000_000) {
      throw new CauceCheckoutError("El pedido supera el máximo permitido.");
    }
    return { ...line, name: product.name, unitPrice: product.price, amount };
  });
  return { currency: "ARS" as const, items, total };
}
