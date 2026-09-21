import { CheckoutValidationError, normalizeCheckoutLines } from "@/lib/commerce/checkout";
import { getIntegrationReadiness } from "@/lib/integrations/config";
import { createMercadoPagoOrder } from "@/lib/integrations/mercadopago/server";
import { attachMercadoPagoOrder, createPendingStoreOrder, markCheckoutError } from "@/lib/integrations/supabase/server";
import { HttpRequestError, noStoreJson, readJsonBody } from "@/lib/http/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const readiness = getIntegrationReadiness();
  if (!readiness.checkoutReady) {
    return noStoreJson({
      error: "El checkout real todavía no está conectado.",
      missing: readiness.missingForCheckout,
    }, { status: 503 });
  }

  let localOrderId: string | undefined;
  try {
    const body = await readJsonBody<{
      requestId?: unknown;
      buyerEmail?: unknown;
      lines?: unknown;
    }>(request);

    if (typeof body.requestId !== "string" || !uuid.test(body.requestId)) {
      return noStoreJson({ error: "Identificador de checkout inválido." }, { status: 400 });
    }

    const buyerEmail = typeof body.buyerEmail === "string" && body.buyerEmail.trim()
      ? body.buyerEmail.trim().toLowerCase()
      : undefined;
    if (buyerEmail && !email.test(buyerEmail)) {
      return noStoreJson({ error: "Ingresá un email válido." }, { status: 400 });
    }

    const lines = normalizeCheckoutLines(body.lines);
    const localOrder = await createPendingStoreOrder({
      requestId: body.requestId,
      buyerEmail,
      lines,
    });
    localOrderId = localOrder.id;

    if (localOrder.checkoutUrl && localOrder.providerOrderId) {
      return noStoreJson({ checkoutUrl: localOrder.checkoutUrl });
    }

    const provider = await createMercadoPagoOrder({
      requestId: body.requestId,
      localOrderId: localOrder.id,
      total: localOrder.total,
      buyerEmail,
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
    if (error instanceof CheckoutValidationError) {
      return noStoreJson({ error: error.message }, { status: 400 });
    }
    return noStoreJson({ error: "No se pudo iniciar el pago. Probá nuevamente." }, { status: 502 });
  }
}
