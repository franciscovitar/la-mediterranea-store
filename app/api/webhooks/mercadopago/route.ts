import { NextRequest } from "next/server";
import { getIntegrationReadiness } from "@/lib/integrations/config";
import { sendPaidOrderNotifications } from "@/lib/integrations/email/server";
import { getMercadoPagoOrder, verifyMercadoPagoSignature } from "@/lib/integrations/mercadopago/server";
import { applyMercadoPagoEvent } from "@/lib/integrations/supabase/server";
import { HttpRequestError, noStoreJson, readJsonBody } from "@/lib/http/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

export async function POST(request: NextRequest) {
  const readiness = getIntegrationReadiness();
  if (!readiness.supabaseServer || !readiness.mercadoPagoApi || !readiness.mercadoPagoWebhook) {
    return noStoreJson({ error: "Webhook no configurado." }, { status: 503 });
  }

  const dataId = request.nextUrl.searchParams.get("data.id") ?? request.nextUrl.searchParams.get("data_id");
  const requestId = request.headers.get("x-request-id");
  const signature = request.headers.get("x-signature");

  if (!dataId || !verifyMercadoPagoSignature({ dataId, requestId, signature })) {
    return noStoreJson({ error: "Firma inválida." }, { status: 401 });
  }

  try {
    const payload = await readJsonBody<unknown>(request, 65_536);
    const providerOrder = await getMercadoPagoOrder(dataId);
    const localOrderId = providerOrder.external_reference;
    if (!localOrderId || !providerOrder.id) {
      return noStoreJson({ error: "La order no tiene referencia local." }, { status: 422 });
    }

    const payloadRecord = isObject(payload) ? payload : {};
    const eventId = String(payloadRecord.id ?? (String(payloadRecord.action ?? "order") + ":" + providerOrder.id + ":" + String(payloadRecord.date_created ?? "")));

    const localStatus = await applyMercadoPagoEvent({
      eventId,
      providerOrderId: providerOrder.id,
      localOrderId,
      status: providerOrder.status ?? "unknown",
      statusDetail: providerOrder.status_detail ?? "unknown",
      totalPaid: Number(providerOrder.total_paid_amount ?? 0),
      payload,
    });

    let notifications: string[] = [];
    if (localStatus === "paid") {
      const delivery = await sendPaidOrderNotifications(localOrderId);
      notifications = delivery.results;
      if (delivery.retryableFailure) {
        return noStoreJson({ error: "Pago registrado; notificación temporalmente pendiente." }, { status: 503 });
      }
    }

    return noStoreJson({ received: true, notifications });
  } catch (error) {
    if (error instanceof HttpRequestError) {
      return noStoreJson({ error: error.message }, { status: error.status });
    }
    return noStoreJson({ error: "No se pudo procesar la notificación." }, { status: 500 });
  }
}
