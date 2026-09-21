import { products, type Product } from "@/lib/products";

export type CheckoutInputLine = {
  productId: string;
  colorKey?: string;
  colorLabel?: string;
  size?: string;
  quantity: number;
};

export type CheckoutQuoteLine = {
  key: string;
  productId: string;
  name: string;
  image: string;
  colorKey?: string;
  colorLabel?: string;
  size?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type CheckoutQuote = {
  currency: "ARS";
  lines: CheckoutQuoteLine[];
  total: number;
};

export class CheckoutValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutValidationError";
  }
}

function optionalText(value: unknown) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length ? normalized : undefined;
}

export function normalizeCheckoutLines(value: unknown): CheckoutInputLine[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new CheckoutValidationError("El carrito está vacío.");
  }
  if (value.length > 50) {
    throw new CheckoutValidationError("El carrito tiene demasiadas líneas.");
  }

  return value.map((raw, index) => {
    if (!raw || typeof raw !== "object") {
      throw new CheckoutValidationError("Línea de carrito inválida en la posición " + (index + 1) + ".");
    }
    const row = raw as Record<string, unknown>;
    const productId = optionalText(row.productId);
    const quantity = Number(row.quantity);
    if (!productId) {
      throw new CheckoutValidationError("Falta el producto en una línea del carrito.");
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      throw new CheckoutValidationError("La cantidad debe estar entre 1 y 99.");
    }
    return {
      productId,
      colorKey: optionalText(row.colorKey),
      colorLabel: optionalText(row.colorLabel),
      size: optionalText(row.size),
      quantity,
    };
  });
}

function activeProduct(catalog: Product[], productId: string): Product {
  const product = catalog.find((candidate) => candidate.id === productId && candidate.active);
  if (!product) throw new CheckoutValidationError("Uno de los productos ya no está disponible.");
  return product;
}

export function quoteCheckoutFromCatalog(rawLines: unknown, catalog: Product[]): CheckoutQuote {
  const input = normalizeCheckoutLines(rawLines);
  const merged = new Map<string, CheckoutInputLine>();

  for (const line of input) {
    const colorIdentity = line.colorKey ?? line.colorLabel ?? "";
    const key = [line.productId, colorIdentity, line.size ?? ""].join("|");
    const previous = merged.get(key);
    const nextQuantity = (previous?.quantity ?? 0) + line.quantity;
    if (nextQuantity > 99) {
      throw new CheckoutValidationError("La cantidad de una variante supera el máximo permitido.");
    }
    merged.set(key, { ...line, quantity: nextQuantity });
  }

  const lines = Array.from(merged.values()).map((line) => {
    const product = activeProduct(catalog, line.productId);
    const color = product.colors?.find((candidate) =>
      candidate.key === line.colorKey || (!line.colorKey && candidate.label === line.colorLabel)
    );

    if (product.colors?.length && !color) {
      throw new CheckoutValidationError("Elegí un color válido para " + product.name + ".");
    }
    if (!product.colors?.length && (line.colorKey || line.colorLabel)) {
      throw new CheckoutValidationError("La variante de color de " + product.name + " no es válida.");
    }
    if (product.sizes?.length && (!line.size || !product.sizes.includes(line.size))) {
      throw new CheckoutValidationError("Elegí un talle válido para " + product.name + ".");
    }
    if (!product.sizes?.length && line.size) {
      throw new CheckoutValidationError("La variante de talle de " + product.name + " no es válida.");
    }

    const unitPrice = product.price;
    const lineTotal = unitPrice * line.quantity;
    return {
      key: [product.id, color?.key ?? "", line.size ?? ""].join("|"),
      productId: product.id,
      name: product.name,
      image: color?.image ?? product.image,
      colorKey: color?.key,
      colorLabel: color?.label,
      size: line.size,
      quantity: line.quantity,
      unitPrice,
      lineTotal,
    };
  });

  const total = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  return { currency: "ARS", lines, total };
}

// Kept for isolated unit tests and unconfigured local development.
export function quoteCheckout(rawLines: unknown): CheckoutQuote {
  return quoteCheckoutFromCatalog(rawLines, products);
}
