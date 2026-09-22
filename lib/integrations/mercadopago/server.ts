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

export async function createMercadoPagoOrder(input: {
  requestId: string;
  localOrderId: string;
  total: number;
  buyerEmail?: string;
}) {
  const { siteUrl } = getMercadoPagoConfig();
  if (!siteUrl) throw new Error("Falta NEXT_PUBLIC_SITE_URL para configurar los retornos de Mercado Pago.");

  const body: Record<string, unknown> = {
    type: "online",
    processing_mode: "manual",
    capture_mode: "automatic_async",
    external_reference: input.localOrderId,
    total_amount: money(input.total),
    description: "Compra La Mediterránea",
    items: [
      {
        title: "Compra La Mediterránea",
        quantity: 1,
        unit_price: money(input.total),
      },
    ],
    config: {
      online: {
        success_url: siteUrl + "/checkout/success",
        failure_url: siteUrl + "/checkout/failure",
        pending_url: siteUrl + "/checkout/pending",
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

  if (!order.id || !order.checkout_url) {
    throw new Error("Mercado Pago no devolvió una URL de checkout.");
  }
  return { id: order.id, checkoutUrl: order.checkout_url };
}

export function getMercadoPagoOrder(providerOrderId: string) {
  return mercadoPagoRequest<MercadoPagoOrder>("/v1/orders/" + encodeURIComponent(providerOrderId), {
    method: "GET",
  });
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
