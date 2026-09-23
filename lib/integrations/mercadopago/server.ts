import { createHmac, timingSafeEqual } from "node:crypto";
import { getMercadoPagoConfig } from "@/lib/integrations/config";

type MercadoPagoOrder = {
  id: string;
  checkout_url?: string;
  external_reference?: string;
  status?: string;
  status_detail?: string;
  total_amount?: string;
  total_paid_amount?: string;
};

export type MercadoPagoCheckoutItem = {
  title: string;
  quantity: number;
  unitPrice: number;
};

async function mercadoPagoRequest<T>(path: string, init: RequestInit): Promise<T> {
  const { accessToken } = getMercadoPagoConfig();
  const response = await fetch("https://api.mercadopago.com" + path, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: "Bearer " + accessToken,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 1200);
    throw new Error("Mercado Pago respondió " + response.status + ": " + detail);
  }
  return response.json() as Promise<T>;
}

function money(value: number) {
  return value.toFixed(2);
}

export function buildMercadoPagoItems(items: MercadoPagoCheckoutItem[]) {
  return items.map((item) => ({
    title: item.title,
    quantity: item.quantity,
    unit_price: money(item.unitPrice),
  }));
}

export function buildMercadoPagoReturnUrls(siteUrl: string, localOrderId: string) {
  const query = "?order_id=" + encodeURIComponent(localOrderId);
  return {
    success: siteUrl + "/checkout/success" + query,
    failure: siteUrl + "/checkout/failure" + query,
    pending: siteUrl + "/checkout/pending" + query,
  };
}

export async function createMercadoPagoOrder(input: {
  requestId: string;
  localOrderId: string;
  total: number;
  buyerEmail?: string;
  items: MercadoPagoCheckoutItem[];
}) {
  const { siteUrl } = getMercadoPagoConfig();
  if (!siteUrl) throw new Error("Falta NEXT_PUBLIC_SITE_URL para configurar los retornos de Mercado Pago.");
  if (!input.items.length) throw new Error("El pedido no tiene ítems para enviar a Mercado Pago.");

  const itemTotal = input.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  if (Math.abs(itemTotal - input.total) > 0.001) {
    throw new Error("El detalle del pedido no coincide con el total autoritativo.");
  }

  const returnUrls = buildMercadoPagoReturnUrls(siteUrl, input.localOrderId);
  const body: Record<string, unknown> = {
    type: "online",
    processing_mode: "manual",
    capture_mode: "automatic_async",
    external_reference: input.localOrderId,
    total_amount: money(input.total),
    description: "Compra La Mediterránea",
    items: buildMercadoPagoItems(input.items),
    config: {
      online: {
        success_url: returnUrls.success,
        failure_url: returnUrls.failure,
        pending_url: returnUrls.pending,
        auto_return: "approved",
      },
    },
  };

  if (input.buyerEmail) body.payer = { email: input.buyerEmail };

  const order = await mercadoPagoRequest<MercadoPagoOrder>("/v1/orders", {
    method: "POST",
    headers: { "X-Idempotency-Key": input.requestId },
    body: JSON.stringify(body),
  });

  if (!order.id || !order.checkout_url) throw new Error("Mercado Pago no devolvió una URL de checkout.");
  return { id: order.id, checkoutUrl: order.checkout_url };
}

export function getMercadoPagoOrder(providerOrderId: string) {
  return mercadoPagoRequest<MercadoPagoOrder>("/v1/orders/" + encodeURIComponent(providerOrderId), { method: "GET" });
}

export function verifyMercadoPagoSignature(input: {
  dataId: string | null;
  requestId: string | null;
  signature: string | null;
}) {
  const { webhookSecret } = getMercadoPagoConfig();
  if (!webhookSecret || !input.signature || !input.dataId) return false;

  let timestamp = "";
  let receivedHash = "";
  for (const part of input.signature.split(",")) {
    const [key, value] = part.split("=", 2).map((piece) => piece.trim());
    if (key === "ts") timestamp = value ?? "";
    if (key === "v1") receivedHash = value ?? "";
  }
  if (!timestamp || !receivedHash) return false;

  const right = Buffer.from(receivedHash, "utf8");
  const dataIds = Array.from(new Set([input.dataId.toLowerCase(), input.dataId]));
  return dataIds.some((dataId) => {
    let manifest = "id:" + dataId + ";";
    if (input.requestId) manifest += "request-id:" + input.requestId + ";";
    manifest += "ts:" + timestamp + ";";
    const left = Buffer.from(createHmac("sha256", webhookSecret).update(manifest).digest("hex"), "utf8");
    return left.length === right.length && timingSafeEqual(left, right);
  });
}
