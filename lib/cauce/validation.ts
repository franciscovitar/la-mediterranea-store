import type { CauceProduct } from "@/lib/cauce/catalog";
import { CauceAccessError } from "@/lib/cauce/auth";

export class CauceValidationError extends Error {
  constructor(message: string) { super(message); }
}

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const imagePattern = /^\/cauce\/[a-z0-9-]+\.webp$/;
const clean = (value: unknown, field: string, max: number, required = true) => {
  if (typeof value !== "string" || value.trim().length > max || (required && !value.trim())) {
    throw new CauceValidationError(`Campo inválido: ${field}.`);
  }
  return value.trim();
};

export function validateCauceProduct(value: unknown): CauceProduct {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new CauceValidationError("Producto inválido.");
  const data = value as Record<string, unknown>;
  const slug = clean(data.slug, "slug", 70);
  if (!slugPattern.test(slug)) throw new CauceValidationError("El identificador debe usar letras, números y guiones.");
  const price = data.price;
  if (typeof price !== "number" || !Number.isInteger(price) || price < 0 || price > 100000000) {
    throw new CauceValidationError("El precio debe ser un entero de pesos válido.");
  }
  const image = clean(data.image, "imagen", 120);
  if (!imagePattern.test(image)) throw new CauceValidationError("Usá una imagen local de Cauce.");
  for (const key of ["featured", "active"]) {
    if (typeof data[key] !== "boolean") throw new CauceValidationError(`Campo inválido: ${key}.`);
  }
  const category = clean(data.category, "categoría", 60);
  const name = clean(data.name, "nombre", 120);
  if (name.length < 2 || category.length < 2) throw new CauceValidationError("Nombre y categoría muy cortos.");
  return {
    id: slug, slug, name, category, price, image,
    description: clean(data.description, "descripción", 1000, false),
    material: clean(data.material, "material", 200, false),
    dimensions: clean(data.dimensions, "medidas", 200, false),
    care: clean(data.care, "cuidados", 400, false),
    badge: data.badge == null || data.badge === "" ? null : clean(data.badge, "etiqueta", 60),
    featured: data.featured as boolean, active: data.active as boolean,
  };
}

export function validateStockAdjustment(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new CauceValidationError("Ajuste inválido.");
  const data = value as Record<string, unknown>;
  const productId = clean(data.productId, "producto", 70);
  if (!slugPattern.test(productId)) throw new CauceValidationError("Producto inválido.");
  if (!Number.isInteger(data.expectedVersion) || (data.expectedVersion as number) < 0 ||
      !Number.isInteger(data.stock) || (data.stock as number) < 0 || (data.stock as number) > 1000000) {
    throw new CauceValidationError("Stock o versión inválidos.");
  }
  const reason = clean(data.reason, "motivo", 200);
  if (reason.length < 3) throw new CauceValidationError("Indicá el motivo del ajuste.");
  return { productId, expectedVersion: data.expectedVersion as number, stock: data.stock as number, reason };
}

export function checkSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const requestUrl = new URL(request.url);
  let originUrl: URL | null = null;
  try { originUrl = origin ? new URL(origin) : null; }
  catch { throw new CauceAccessError("Origen no autorizado.", 403); }
  // Next may normalize request.url to localhost behind a reverse proxy.
  // The inbound Host still identifies the requested site; require both host and scheme.
  const inboundHost = request.headers.get("host") || requestUrl.host;
  const scheme = request.headers.get("x-forwarded-proto") || requestUrl.protocol.slice(0, -1);
  if (!originUrl || originUrl.host !== inboundHost || originUrl.protocol !== `${scheme}:`) {
    throw new CauceAccessError("Origen no autorizado.", 403);
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new CauceValidationError("Se requiere JSON.");
  }
}
