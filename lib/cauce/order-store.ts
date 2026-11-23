import { createClient } from "@supabase/supabase-js";
import { caucePublicConfig, cauceSandboxPaymentProcessingConfigured } from "@/lib/cauce/config";
import { CauceCheckoutError, type CheckoutLine } from "@/lib/cauce/checkout";

export type StoredOrder = {
  id: string; request_key: string; total_amount: number; status: string;
  currency: string; preference_id: string | null; expires_at: string;
};

export function visibleCauceOrderStatus(order: Pick<StoredOrder, "status" | "expires_at">, nowMs = Date.now()) {
  return order.status === "pending" && Date.parse(order.expires_at) <= nowMs ? "expired_test" : order.status;
}

export function cauceOrderClient() {
  // Existing sandbox payments must remain verifiable after new checkout attempts are paused.
  if (!cauceSandboxPaymentProcessingConfigured()) throw new CauceCheckoutError("El procesamiento de pagos de prueba no está configurado.", 503);
  const { url } = caucePublicConfig();
  const key = process.env.CAUCE_SUPABASE_SECRET_KEY;
  if (!key) throw new CauceCheckoutError("El checkout no está configurado.", 503);
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

type OrderClient = ReturnType<typeof cauceOrderClient>;

export async function getStoredOrder(client: OrderClient, id: string, requestKey?: string): Promise<StoredOrder> {
  let query = client.from("cauce_orders").select("id,request_key,total_amount,status,currency,preference_id,expires_at").eq("id", id);
  if (requestKey) query = query.eq("request_key", requestKey);
  const { data, error } = await query.maybeSingle();
  if (error) throw new CauceCheckoutError("No pudimos consultar el pedido.", 502);
  if (!data) throw new CauceCheckoutError("Pedido no encontrado.", 404);
  return data as StoredOrder;
}

export async function openCauceOrder(client: OrderClient, key: string, lines: CheckoutLine[]) {
  const { data, error } = await client.rpc("cauce_checkout_open", { p_request_key: key, p_lines: lines });
  if (error) {
    if (error.code === "P0001" || error.code === "22023") throw new CauceCheckoutError("Cambió la disponibilidad. Revisá el carrito.", 409);
    throw new CauceCheckoutError("No pudimos reservar el pedido.", 502);
  }
  const orderId = (data as Array<{ order_id?: string }> | null)?.[0]?.order_id;
  if (!orderId) throw new CauceCheckoutError("No se confirmó la reserva.", 502);
  return getStoredOrder(client, orderId, key);
}

export async function getStoredItems(client: OrderClient, orderId: string) {
  const { data, error } = await client.from("cauce_order_items")
    .select("product_id,product_name,unit_price,quantity").eq("order_id", orderId).order("product_id");
  if (error || !data?.length) throw new CauceCheckoutError("No se pudo leer el detalle del pedido.", 502);
  return data;
}

export function sameStoredLines(input: CheckoutLine[], stored: Array<{ product_id: string; quantity: number }>) {
  if (input.length !== stored.length) return false;
  const byId = new Map(stored.map((item) => [item.product_id, item.quantity]));
  return input.every((item) => byId.get(item.productId) === item.quantity);
}
