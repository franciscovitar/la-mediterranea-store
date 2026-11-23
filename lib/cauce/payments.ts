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
  const returnUrl = `${input.origin}/pedido/resultado?order=${input.orderId}&key=${input.requestKey}`;
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

export function validateCauceProviderPayment(payment: Record<string, unknown>, expected: {
  paymentId: string; orderId: string; totalAmount: number;
}) {
  if (String(payment.id) !== expected.paymentId || payment.external_reference !== expected.orderId ||
      payment.live_mode !== false || payment.currency_id !== "ARS" ||
      typeof payment.transaction_amount !== "number" ||
      !Number.isSafeInteger(payment.transaction_amount) || payment.transaction_amount !== expected.totalAmount ||
      !["approved", "pending", "in_process", "rejected", "cancelled"].includes(String(payment.status))) {
    throw new CauceCheckoutError("El pago no coincide con este pedido de prueba.", 422);
  }
  return payment.status as "approved" | "pending" | "in_process" | "rejected" | "cancelled";
}
