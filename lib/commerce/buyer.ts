export type FulfillmentMethod = "pickup" | "delivery";

export type BuyerDetails = {
  buyerName: string;
  buyerPhone: string;
  buyerEmail?: string;
  buyerNotes?: string;
  fulfillmentMethod: FulfillmentMethod;
};

export class BuyerValidationError extends Error {}

function compact(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeBuyerDetails(input: {
  buyerName?: unknown;
  buyerPhone?: unknown;
  buyerEmail?: unknown;
  buyerNotes?: unknown;
  fulfillmentMethod?: unknown;
}): BuyerDetails {
  const buyerName = typeof input.buyerName === "string" ? compact(input.buyerName) : "";
  if (buyerName.length < 2 || buyerName.length > 120) {
    throw new BuyerValidationError("Ingresá tu nombre y apellido.");
  }

  const buyerPhone = typeof input.buyerPhone === "string" ? compact(input.buyerPhone) : "";
  const phoneDigits = buyerPhone.replace(/\D/g, "");
  if (buyerPhone.length > 40 || phoneDigits.length < 6 || phoneDigits.length > 20) {
    throw new BuyerValidationError("Ingresá un teléfono válido.");
  }

  const rawEmail = typeof input.buyerEmail === "string" ? input.buyerEmail.trim().toLowerCase() : "";
  if (rawEmail && (rawEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail))) {
    throw new BuyerValidationError("Ingresá un email válido.");
  }

  const buyerNotes = typeof input.buyerNotes === "string" ? input.buyerNotes.trim() : "";
  if (buyerNotes.length > 1000) {
    throw new BuyerValidationError("Las observaciones son demasiado largas.");
  }

  if (input.fulfillmentMethod !== "pickup" && input.fulfillmentMethod !== "delivery") {
    throw new BuyerValidationError("Elegí retiro o entrega a coordinar.");
  }

  return {
    buyerName,
    buyerPhone,
    buyerEmail: rawEmail || undefined,
    buyerNotes: buyerNotes || undefined,
    fulfillmentMethod: input.fulfillmentMethod,
  };
}
