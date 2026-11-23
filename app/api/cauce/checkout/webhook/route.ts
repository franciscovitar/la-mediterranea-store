import { CauceCheckoutError, validCheckoutUuid } from "@/lib/cauce/checkout";
import { checkoutHttpError, checkoutJson } from "@/lib/cauce/checkout-http";
import { cauceSandboxPaymentProcessingConfigured } from "@/lib/cauce/config";
import { cauceOrderClient, getStoredOrder } from "@/lib/cauce/order-store";
import { getCaucePayment, isCauceOfficialTestCard, validateCauceProviderPayment, verifyCauceWebhookSignature } from "@/lib/cauce/payments";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (!cauceSandboxPaymentProcessingConfigured()) throw new CauceCheckoutError("Webhook no configurado.", 503);
    const url = new URL(request.url);
    const id = url.searchParams.get("data.id") ?? "";
    if (url.searchParams.get("type") !== "payment") return checkoutJson({ ignored: true });
    if (!verifyCauceWebhookSignature({
      signature: request.headers.get("x-signature"), requestId: request.headers.get("x-request-id"),
      dataId: id, secret: process.env.CAUCE_MERCADOPAGO_WEBHOOK_SECRET ?? "",
    })) throw new CauceCheckoutError("Firma inválida.", 401);
    const payment = await getCaucePayment(id);
    const orderId = payment.external_reference;
    if (!validCheckoutUuid(orderId)) throw new CauceCheckoutError("Referencia de pedido inválida.", 422);
    const order = await getStoredOrder(cauceOrderClient(), orderId);
    if (!order.preference_id) throw new CauceCheckoutError("El pedido no tiene preferencia de prueba.", 422);
    const status = validateCauceProviderPayment(payment, {
      paymentId: id, orderId: order.id, totalAmount: order.total_amount,
      sellerId: process.env.CAUCE_MERCADOPAGO_TEST_SELLER_ID ?? "",
    });
    const { data, error } = await cauceOrderClient().rpc("cauce_checkout_apply_proven_test_payment", {
      p_order_id: order.id, p_payment_id: id, p_preference_id: order.preference_id,
      p_provider_status: status, p_amount: payment.transaction_amount,
      p_currency: payment.currency_id, p_live_mode: payment.live_mode,
      p_test_seller_verified: true, p_test_card_verified: isCauceOfficialTestCard(payment),
    });
    if (error) throw new CauceCheckoutError("La confirmación quedó pendiente de reintento.", 503);
    return checkoutJson({ received: true, status: data });
  } catch (error) { return checkoutHttpError(error); }
}
