import { CauceCheckoutError, validCheckoutUuid } from "@/lib/cauce/checkout";
import { checkoutHttpError, checkoutJson } from "@/lib/cauce/checkout-http";
import { cauceSandboxPaymentProcessingConfigured } from "@/lib/cauce/config";
import { cauceOrderClient, getStoredOrder } from "@/lib/cauce/order-store";
import { getCaucePayment, getCaucePaymentByOrderReference, validateCauceProviderPayment } from "@/lib/cauce/payments";
import { checkSameOrigin } from "@/lib/cauce/validation";
import { readJsonBody } from "@/lib/http/request";

export const dynamic = "force-dynamic";

/** Test credentials do not emit automatic payment notifications. Verify the provider directly. */
export async function POST(request: Request) {
  try {
    checkSameOrigin(request);
    if (!cauceSandboxPaymentProcessingConfigured()) throw new CauceCheckoutError("Procesamiento de prueba no disponible.", 503);
    const body = await readJsonBody<{ orderId?: unknown; requestKey?: unknown; paymentId?: unknown }>(request, 2048);
    if (!validCheckoutUuid(body?.orderId) || !validCheckoutUuid(body?.requestKey) ||
        (body?.paymentId !== undefined &&
          (typeof body.paymentId !== "string" || !/^\d{1,30}$/.test(body.paymentId)))) {
      throw new CauceCheckoutError("Datos de confirmación inválidos.");
    }
    const client = cauceOrderClient();
    const order = await getStoredOrder(client, body.orderId, body.requestKey);
    if (!order.preference_id) throw new CauceCheckoutError("El pedido no tiene preferencia de prueba.", 422);

    // Neither the browser's success URL nor its payment ID is evidence of approval.
    const found = body.paymentId
      ? { id: body.paymentId, payment: await getCaucePayment(body.paymentId) }
      : await getCaucePaymentByOrderReference(order.id);
    if (!found) return checkoutJson({ verified: false, status: "pending" });
    const { id, payment } = found;
    if (String(payment.collector_id) !== process.env.CAUCE_MERCADOPAGO_TEST_SELLER_ID) {
      throw new CauceCheckoutError("El pago no corresponde al vendedor de prueba.", 422);
    }
    const status = validateCauceProviderPayment(payment, {
      paymentId: id, orderId: order.id, totalAmount: order.total_amount,
      sellerId: process.env.CAUCE_MERCADOPAGO_TEST_SELLER_ID ?? "",
    });
    const { data, error } = await client.rpc("cauce_checkout_apply_proven_test_payment", {
      p_order_id: order.id, p_payment_id: id, p_preference_id: order.preference_id,
      p_provider_status: status, p_amount: payment.transaction_amount,
      p_currency: payment.currency_id, p_live_mode: payment.live_mode,
      p_test_seller_verified: true, p_test_card_verified: true,
    });
    if (error) throw new CauceCheckoutError("La confirmación quedó pendiente de reintento.", 503);
    return checkoutJson({ verified: true, status: data });
  } catch (error) { return checkoutHttpError(error); }
}
