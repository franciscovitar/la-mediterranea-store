import { CauceCheckoutError, validCheckoutUuid } from "@/lib/cauce/checkout";
import { checkoutHttpError, checkoutJson } from "@/lib/cauce/checkout-http";
import { cauceOrderClient, getStoredOrder } from "@/lib/cauce/order-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("order");
    const key = url.searchParams.get("key");
    if (!validCheckoutUuid(id) || !validCheckoutUuid(key)) throw new CauceCheckoutError("Consulta inválida.");
    const order = await getStoredOrder(cauceOrderClient(), id, key);
    return checkoutJson({ id: order.id, status: order.status, total: order.total_amount,
      currency: order.currency, expiresAt: order.expires_at });
  } catch (error) { return checkoutHttpError(error); }
}
