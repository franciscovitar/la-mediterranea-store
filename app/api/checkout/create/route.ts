import { CheckoutValidationError, normalizeCheckoutLines } from "@/lib/commerce/checkout";
import { BuyerValidationError, normalizeBuyerDetails } from "@/lib/commerce/buyer";
import { getIntegrationReadiness } from "@/lib/integrations/config";
import { createMercadoPagoOrder } from "@/lib/integrations/mercadopago/server";
import { attachMercadoPagoOrder, createPendingStoreOrder, getStoreOrderItems, markCheckoutError } from "@/lib/integrations/supabase/server";
import { HttpRequestError, noStoreJson, readJsonBody } from "@/lib/http/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const readiness = getIntegrationReadiness();
  if (!readiness.checkoutReady) {
    return noStoreJson({
      error: "El pago online no está disponible por el momento.",
      missing: readiness.missingForCheckout,
    }, { status: 503 });
  }

  let localOrderId: string | undefined;
  try {
    const body = await readJsonBody<{
      requestId?: unknown;
      buyerName?: unknown;
      buyerPhone?: unknown;
      buyerEmail?: unknown;
      buyerNotes?: unknown;
      fulfillmentMethod?: unknown;
      lines?: unknown;
    }>(request);

    if (typeof body.requestId !== "string" || !uuid.test(body.requestId)) {
      return noStoreJson({ error: "Identificador de checkout inválido." }, { status: 400 });
    }

    const buyer = normalizeBuyerDetails(body);
    const lines = normalizeCheckoutLines(body.lines);
    const localOrder = await createPendingStoreOrder({ requestId: body.requestId, buyer, lines });
    localOrderId = localOrder.id;

    if (localOrder.checkoutUrl && localOrder.providerOrderId) {
      return noStoreJson({ checkoutUrl: localOrder.checkoutUrl });
    }

    const storedItems = await getStoreOrderItems(localOrder.id);
    const provider = await createMercadoPagoOrder({
      requestId: body.requestId,
      localOrderId: localOrder.id,
      total: localOrder.total,
      buyerEmail: buyer.buyerEmail,
      items: storedItems.map((item) => ({
        title: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    });

    await attachMercadoPagoOrder({
      orderId: localOrder.id,
      providerOrderId: provider.id,
      checkoutUrl: provider.checkoutUrl,
    });

    return noStoreJson({ checkoutUrl: provider.checkoutUrl });
  } catch (error) {
    if (localOrderId) {
      try {
        await markCheckoutError(localOrderId, error instanceof Error ? error.message : "checkout_error");
      } catch {
        // Keep the original checkout failure.
      }
    }
    if (error instanceof HttpRequestError) {
      return noStoreJson({ error: error.message }, { status: error.status });
    }
    if (error instanceof CheckoutValidationError || error instanceof BuyerValidationError) {
      return noStoreJson({ error: error.message }, { status: 400 });
    }
    return noStoreJson({ error: "No se pudo iniciar el pago. Probá nuevamente." }, { status: 502 });
  }
}
