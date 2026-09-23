export type StoredCheckoutRequest = {
  requestId: string;
  fingerprint: string;
};

export type CheckoutBuyerFingerprint = {
  buyerName?: string;
  buyerPhone?: string;
  buyerEmail?: string;
  buyerNotes?: string;
  fulfillmentMethod?: "pickup" | "delivery";
};

export function checkoutFingerprint(
  lines: Array<{ productId: string; colorKey?: string; size?: string; quantity: number }>,
  buyer: CheckoutBuyerFingerprint | string = {},
) {
  const details = typeof buyer === "string" ? { buyerEmail: buyer } : buyer;
  const normalizedBuyer = {
    buyerName: details.buyerName?.trim().replace(/\s+/g, " ") ?? "",
    buyerPhone: details.buyerPhone?.trim().replace(/\s+/g, " ") ?? "",
    buyerEmail: details.buyerEmail?.trim().toLowerCase() ?? "",
    buyerNotes: details.buyerNotes?.trim() ?? "",
    fulfillmentMethod: details.fulfillmentMethod ?? "",
  };
  const normalizedLines = [...lines]
    .map((line) => ({
      productId: line.productId,
      colorKey: line.colorKey ?? "",
      size: line.size ?? "",
      quantity: line.quantity,
    }))
    .sort((a, b) =>
      [a.productId, a.colorKey, a.size].join("|").localeCompare([b.productId, b.colorKey, b.size].join("|"))
    );

  return JSON.stringify({ buyer: normalizedBuyer, lines: normalizedLines });
}

export function readStoredCheckoutRequest(raw: string | null): StoredCheckoutRequest | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredCheckoutRequest>;
    if (
      typeof parsed.requestId === "string" &&
      typeof parsed.fingerprint === "string" &&
      parsed.requestId &&
      parsed.fingerprint
    ) {
      return { requestId: parsed.requestId, fingerprint: parsed.fingerprint };
    }
  } catch {
    // Previous versions stored only a bare UUID. Treat it as stale.
  }
  return null;
}
