import { NextRequest } from "next/server";
import { getIntegrationReadiness } from "@/lib/integrations/config";
import { getMercadoPagoOrder, verifyMercadoPagoSignature } from "@/lib/integrations/mercadopago/server";
import { applyMercadoPagoEvent } from "@/lib/integrations/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

export async function POST(request: NextRequest) {
  const readiness = getIntegrationReadiness();
  if (!readiness.supabaseServer || !readiness.mercadoPagoApi || !readiness.mercadoPagoWebhook) {
    return Response.json({ error: "Webhook no configurado." }, { status: 503 });
  }

  const dataId = request.nextUrl.searchParams.get("data.id");
  const requestId = request.headers.get("x-request-id");
  const signature = request.headers.get("x-signature");

  if (!dataId || !verifyMercadoPagoSignature({ dataId, requestId, signature })) {
    return Response.json({ error: "Firma inválida." }, { status: 401 });
  }

  try {
    const payload = await request.json() as unknown;
    const providerOrder = await getMercadoPagoOrder(dataId);
    const localOrderId = providerOrder.external_reference;
    if (!localOrderId || !providerOrder.id) {
      return Response.json({ error: "La order no tiene referencia local." }, { status: 422 });
    }

    const payloadRecord = isObject(payload) ? payload : {};
    const eventId = String(payloadRecord.id ?? (String(payloadRecord.action ?? "order") + ":" + providerOrder.id + ":" + String(payloadRecord.date_created ?? "")));

    await applyMercadoPagoEvent({
      eventId,
      providerOrderId: providerOrder.id,
      localOrderId,
      status: providerOrder.status ?? "unknown",
      statusDetail: providerOrder.status_detail ?? "unknown",
      totalPaid: Number(providerOrder.total_paid_amount ?? 0),
      payload,
    });

    return Response.json({ received: true });
  } catch {
    return Response.json({ error: "No se pudo procesar la notificación." }, { status: 500 });
  }
}
