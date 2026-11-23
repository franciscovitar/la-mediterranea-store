import { createHmac, timingSafeEqual } from "node:crypto";
import { CauceCheckoutError, safeTestCheckoutUrl } from "@/lib/cauce/checkout";

const apiOrigin = "https://api.mercadopago.com";
const identityUrl = "https://api.mercadolibre.com/users/me";

/** The isolated Preview is SSO-protected; Mercado Pago webhooks cannot send custom headers. */
export function cauceProtectedWebhookUrl(origin: string, bypass: string | undefined) {
  if (!/^[A-Za-z0-9_-]{20,200}$/.test(bypass ?? "")) {
    throw new CauceCheckoutError("Notificaciones de prueba no disponibles en este Preview.", 503);
  }
  const url = new URL("/api/cauce/checkout/webhook", origin);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".vercel.app") || url.username || url.password || url.port) {
    throw new CauceCheckoutError("URL de notificación inválida.", 503);
  }
  url.searchParams.set("x-vercel-protection-bypass", bypass!);
  return url.toString();
}

export function verifyCauceWebhookSignature({ signature, requestId, dataId, secret, nowMs = Date.now() }: {
  signature: string | null; requestId: string | null; dataId: string; secret: string; nowMs?: number;
}) {
  if (!signature || !requestId || !/^\d{1,30}$/.test(dataId) || !secret) return false;
  const parts = Object.fromEntries(signature.split(",").map((s) => s.trim().split("=", 2)));
  if (!/^\d{10,13}$/.test(parts.ts ?? "") || !/^[a-f0-9]{64}$/i.test(parts.v1 ?? "")) return false;
  const rawTs = Number(parts.ts);
  const timeMs = parts.ts.length === 10 ? rawTs * 1000 : rawTs;
  if (!Number.isFinite(timeMs) || Math.abs(nowMs - timeMs) > 5 * 60 * 1000) return false;
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest();
  const actual = Buffer.from(parts.v1, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function configuredTestToken() {
  const token = process.env.CAUCE_MERCADOPAGO_TEST_ACCESS_TOKEN;
  if (!/^APP_USR-[A-Za-z0-9_-]{12,}$/.test(token ?? "")) {
    throw new CauceCheckoutError("El pago de prueba no está configurado.", 503);
  }
  return token;
}

/** A prefix is not evidence of sandbox status. The provider must attest a test seller. */
export function isVerifiedCauceTestSeller(identity: unknown, expectedId: string) {
  if (!identity || typeof identity !== "object" || Array.isArray(identity)) return false;
  const user = identity as Record<string, unknown>;
  return /^\d{5,20}$/.test(expectedId) && String(user.id) === expectedId &&
    Array.isArray(user.tags) && user.tags.includes("test_user") &&
    (user.site_id === undefined || user.site_id === "MLA");
}

async function verifiedTestToken() {
  const token = configuredTestToken();
  const sellerId = process.env.CAUCE_MERCADOPAGO_TEST_SELLER_ID ?? "";
  if (!/^\d{5,20}$/.test(sellerId)) {
    throw new CauceCheckoutError("Falta verificar el vendedor de prueba.", 503);
  }
  let identity: unknown;
  try {
    const response = await fetch(identityUrl, {
      headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw Error("identity-unavailable");
    identity = await response.json();
  } catch {
    throw new CauceCheckoutError("No se pudo verificar la cuenta de prueba de Mercado Pago.", 503);
  }
  if (!isVerifiedCauceTestSeller(identity, sellerId)) {
    throw new CauceCheckoutError("La credencial no corresponde al vendedor de prueba autorizado.", 503);
  }
  return token;
}

async function mpRequest(path: string, init: RequestInit = {}) {
  const token = await verifiedTestToken();
  const response = await fetch(`${apiOrigin}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new CauceCheckoutError("Mercado Pago no pudo confirmar la operación de prueba.", 502);
  return response.json() as Promise<Record<string, unknown>>;
}

export async function createCaucePreference(input: {
  orderId: string; requestKey: string; expiresAt: string; origin: string;
  items: Array<{ productId: string; name: string; quantity: number; unitPrice: number }>;
}) {
  const returnUrl = `${input.origin}/cauce/pedido/resultado?order=${input.orderId}&key=${input.requestKey}`;
  const result = await mpRequest("/checkout/preferences", {
    method: "POST",
    body: JSON.stringify({
      items: input.items.map((p) => ({ id: p.productId, title: p.name, quantity: p.quantity, currency_id: "ARS", unit_price: p.unitPrice })),
      external_reference: input.orderId,
      notification_url: cauceProtectedWebhookUrl(input.origin, process.env.VERCEL_AUTOMATION_BYPASS_SECRET),
      back_urls: { success: `${returnUrl}&return=success`, pending: `${returnUrl}&return=pending`, failure: `${returnUrl}&return=failure` },
      auto_return: "approved",
      expires: true,
      expiration_date_to: input.expiresAt,
      metadata: { cauce_request_key: input.requestKey },
    }),
  });
  if (typeof result.id !== "string" || result.id.length < 5) throw new CauceCheckoutError("Preferencia inválida.", 502);
  if (String(result.collector_id) !== process.env.CAUCE_MERCADOPAGO_TEST_SELLER_ID) {
    throw new CauceCheckoutError("La preferencia no pertenece al vendedor de prueba.", 502);
  }
  return { id: result.id, url: safeTestCheckoutUrl(result.init_point, result.id) };
}

export async function getCaucePreference(id: string) {
  if (!/^[a-zA-Z0-9-]{5,160}$/.test(id)) throw new CauceCheckoutError("Preferencia inválida.", 400);
  const result = await mpRequest(`/checkout/preferences/${encodeURIComponent(id)}`);
  if (result.id !== id || String(result.collector_id) !== process.env.CAUCE_MERCADOPAGO_TEST_SELLER_ID) {
    throw new CauceCheckoutError("La preferencia no pertenece al vendedor de prueba.", 502);
  }
  return safeTestCheckoutUrl(result.init_point, id);
}

export async function getCaucePayment(id: string) {
  if (!/^\d{1,30}$/.test(id)) throw new CauceCheckoutError("Pago inválido.", 400);
  return mpRequest(`/v1/payments/${id}`);
}

/**
 * Checkout Pro can return without payment_id, and test credentials do not emit
 * actual webhook notifications. Search only the stored order's exact reference;
 * ambiguity must not mark a purchase paid or alter stock automatically.
 */
export function oneCauceSearchPaymentId(search: unknown): string | null {
  if (!search || typeof search !== "object" || Array.isArray(search)) {
    throw new CauceCheckoutError("Respuesta de búsqueda de pagos inválida.", 502);
  }
  const data = search as Record<string, unknown>;
  const paging = data.paging && typeof data.paging === "object" && !Array.isArray(data.paging)
    ? data.paging as Record<string, unknown> : {};
  const total = paging.total;
  if (!Number.isSafeInteger(total) || (total as number) < 0 || !Array.isArray(data.results)) {
    throw new CauceCheckoutError("Respuesta de búsqueda de pagos inválida.", 502);
  }
  if (total === 0 && data.results.length === 0) return null;
  if (total !== 1 || data.results.length !== 1) {
    throw new CauceCheckoutError("Hay más de un pago para este intento. Se requiere revisión.", 409);
  }
  const result = data.results[0];
  const id = result && typeof result === "object" && !Array.isArray(result)
    ? String((result as Record<string, unknown>).id ?? "") : "";
  if (!/^\d{1,30}$/.test(id)) throw new CauceCheckoutError("ID de pago inválido.", 502);
  return id;
}

export async function getCaucePaymentByOrderReference(orderId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) {
    throw new CauceCheckoutError("Referencia de pedido inválida.", 400);
  }
  const query = new URLSearchParams({
    sort: "date_created", criteria: "desc", external_reference: orderId,
    limit: "2", offset: "0",
  });
  const search = await mpRequest(`/v1/payments/search?${query}`);
  const id = oneCauceSearchPaymentId(search);
  return id ? { id, payment: await getCaucePayment(id) } : null;
}

// Official Mercado Pago Argentina test cards. We verify both the method and
// the exposed BIN/last four; no full card details are stored or logged.
const officialTestCards: Record<string, readonly string[]> = {
  visa: ["450995:3704", "400276:5619"],
  master: ["503175:0604", "528733:3304"],
  amex: ["371180:7522"],
};

export function isCauceOfficialTestCard(payment: Record<string, unknown>) {
  const card = payment.card;
  if (!card || typeof card !== "object" || Array.isArray(card)) return false;
  const cardDetails = card as Record<string, unknown>;
  const method = String(payment.payment_method_id ?? "");
  const partialCard = `${String(cardDetails.first_six_digits ?? "")}:${String(cardDetails.last_four_digits ?? "")}`;
  return officialTestCards[method]?.includes(partialCard) ?? false;
}

export function validateCauceProviderPayment(payment: Record<string, unknown>, expected: {
  paymentId: string; orderId: string; totalAmount: number; sellerId: string;
}) {
  const checks = {
    paymentId: String(payment.id) === expected.paymentId,
    externalReference: payment.external_reference === expected.orderId,
    testSeller: /^\d{5,20}$/.test(expected.sellerId) && String(payment.collector_id) === expected.sellerId,
    // Mercado Pago can omit the card fingerprint for rejected/pending attempts.
    // No sale or stock decrement is allowed without official test-card proof.
    officialTestCard: payment.status !== "approved" || isCauceOfficialTestCard(payment),
    modeKnown: typeof payment.live_mode === "boolean",
    currency: payment.currency_id === "ARS",
    integerAmount: typeof payment.transaction_amount === "number" && Number.isSafeInteger(payment.transaction_amount),
    amount: payment.transaction_amount === expected.totalAmount,
    status: ["approved", "pending", "in_process", "rejected", "cancelled"].includes(String(payment.status)),
  };
  const failed = Object.entries(checks).filter(([, valid]) => !valid).map(([field]) => field);
  if (failed.length > 0) {
    // Only non-identifying flags: no customer, card, payment or secret data in logs.
    console.warn("CAUCE_TEST_PAYMENT_VERIFICATION_FAILED", { fields: failed });
    throw new CauceCheckoutError("El pago no coincide con este pedido de prueba.", 422);
  }
  // Checkout Pro with production credentials of a *test_user* seller can
  // return live_mode=true. The seller account is independently attested by
  // /users/me before each MP API call. Approved payments additionally require
  // the known official test-card fingerprint before affecting inventory.
  // Non-approved attempts never imply that a test card was verified.
  return payment.status as "approved" | "pending" | "in_process" | "rejected" | "cancelled";
}
