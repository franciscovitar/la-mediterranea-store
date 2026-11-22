import { createHmac, timingSafeEqual } from "node:crypto";
import { CauceCheckoutError } from "@/lib/cauce/checkout";

const apiOrigin = "https://api.mercadopago.com";

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

function testToken() {
  const token = process.env.CAUCE_MERCADOPAGO_TEST_ACCESS_TOKEN;
  if (!token?.startsWith("TEST-")) throw new CauceCheckoutError("El pago de prueba no está configurado.", 503);
  return token;
}

async function mpRequest(path: string, init: RequestInit = {}) {
  const response = await fetch(`${apiOrigin}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${testToken()}`, "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new CauceCheckoutError("Mercado Pago no pudo confirmar la operación de prueba.", 502);
  return response.json() as Promise<Record<string, unknown>>;
}

export function safeSandboxUrl(value: unknown) {
  if (typeof value !== "string") throw new CauceCheckoutError("Enlace de pago de prueba inválido.", 502);
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "sandbox.mercadopago.com" ||
        !url.pathname.startsWith("/mla/checkout/") || url.username || url.password) throw Error();
    return url.toString();
  } catch { throw new CauceCheckoutError("Enlace de pago de prueba inválido.", 502); }
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
      notification_url: `${input.origin}/api/cauce/checkout/webhook`,
      back_urls: { success: `${returnUrl}&return=success`, pending: `${returnUrl}&return=pending`, failure: `${returnUrl}&return=failure` },
      auto_return: "approved",
      expires: true,
      expiration_date_to: input.expiresAt,
      metadata: { cauce_request_key: input.requestKey },
    }),
  });
  if (typeof result.id !== "string" || result.id.length < 5) throw new CauceCheckoutError("Preferencia inválida.", 502);
  return { id: result.id, url: safeSandboxUrl(result.sandbox_init_point) };
}

export async function getCaucePreference(id: string) {
  if (!/^[a-zA-Z0-9-]{5,160}$/.test(id)) throw new CauceCheckoutError("Preferencia inválida.", 400);
  const result = await mpRequest(`/checkout/preferences/${encodeURIComponent(id)}`);
  return safeSandboxUrl(result.sandbox_init_point);
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
