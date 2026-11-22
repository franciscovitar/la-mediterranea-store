import { getCauceProducts } from "@/lib/cauce/backend";
import { cauceCheckoutOrigin, cauceSandboxCheckoutEnabled } from "@/lib/cauce/config";
import { CauceCheckoutError, parseCheckoutLines, quoteCheckout, validCheckoutUuid } from "@/lib/cauce/checkout";
import { checkoutHttpError, checkoutJson } from "@/lib/cauce/checkout-http";
import { cauceOrderClient, getStoredItems, openCauceOrder, sameStoredLines } from "@/lib/cauce/order-store";
import { createCaucePreference, getCaucePreference } from "@/lib/cauce/payments";
import { checkSameOrigin } from "@/lib/cauce/validation";
import { readJsonBody } from "@/lib/http/request";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    checkSameOrigin(request);
    if (!cauceSandboxCheckoutEnabled()) throw new CauceCheckoutError("Los pagos de prueba todavía no están habilitados.", 503);
    const body = await readJsonBody<{ lines?: unknown; requestKey?: unknown }>(request, 4096);
    const lines = parseCheckoutLines(body?.lines);
    if (!validCheckoutUuid(body?.requestKey)) throw new CauceCheckoutError("Identificador del pedido inválido.");
    quoteCheckout(lines, await getCauceProducts());
    const client = cauceOrderClient();
    const order = await openCauceOrder(client, body.requestKey, lines);
    const storedItems = await getStoredItems(client, order.id);
    if (!sameStoredLines(lines, storedItems)) throw new CauceCheckoutError("Este intento corresponde a otro carrito.", 409);
    if (order.status !== "pending" || Date.parse(order.expires_at) <= Date.now()) {
      throw new CauceCheckoutError("Este intento de pago ya finalizó o expiró.", 409);
    }
    if (order.preference_id) {
      return checkoutJson({ orderId: order.id, checkoutUrl: await getCaucePreference(order.preference_id) });
    }
    const origin = cauceCheckoutOrigin();
    if (!origin) throw new CauceCheckoutError("URL de prueba no configurada.", 503);
    const preference = await createCaucePreference({
      orderId: order.id, requestKey: body.requestKey, origin, expiresAt: order.expires_at,
      items: storedItems.map((item) => ({
        productId: item.product_id, name: item.product_name,
        quantity: item.quantity, unitPrice: item.unit_price,
      })),
    });
    const { error } = await client.rpc("cauce_checkout_attach_preference", {
      p_order_id: order.id, p_preference_id: preference.id,
    });
    if (error) throw new CauceCheckoutError("El inicio del pago quedó pendiente. Reintentá más tarde.", 409);
    return checkoutJson({ orderId: order.id, checkoutUrl: preference.url }, 201);
  } catch (error) { return checkoutHttpError(error); }
}
