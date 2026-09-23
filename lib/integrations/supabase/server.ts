import type { CheckoutInputLine } from "@/lib/commerce/checkout";
import { getSupabaseServerConfig } from "@/lib/integrations/config";

type PendingOrderRow = {
  order_id: string;
  total_amount: number | string;
  checkout_url: string | null;
  provider_order_id: string | null;
};

type StoreOrderItemRow = {
  product_name: string;
  color_label: string | null;
  size: string | null;
  quantity: number;
  unit_price: number | string;
  line_total: number | string;
};

type StoreOrderStatusRow = {
  id: string;
  status: string;
  total_amount: number | string;
};

async function supabaseRequest<T>(path: string, init: RequestInit): Promise<T> {
  const { url, secretKey } = getSupabaseServerConfig();
  const response = await fetch(url + "/rest/v1/" + path, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: secretKey,
      Authorization: "Bearer " + secretKey,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 1000);
    throw new Error("Supabase respondió " + response.status + ": " + detail);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function createPendingStoreOrder(input: {
  requestId: string;
  buyerEmail?: string;
  lines: CheckoutInputLine[];
}) {
  const rows = await supabaseRequest<PendingOrderRow[]>("rpc/create_checkout_order", {
    method: "POST",
    body: JSON.stringify({
      p_request_id: input.requestId,
      p_buyer_email: input.buyerEmail ?? null,
      p_items: input.lines,
    }),
  });
  const row = rows[0];
  if (!row?.order_id) throw new Error("Supabase no devolvió el pedido creado.");

  return {
    id: row.order_id,
    total: Number(row.total_amount),
    checkoutUrl: row.checkout_url,
    providerOrderId: row.provider_order_id,
  };
}

export async function attachMercadoPagoOrder(input: {
  orderId: string;
  providerOrderId: string;
  checkoutUrl: string;
}) {
  const query = "orders?id=eq." + encodeURIComponent(input.orderId);
  await supabaseRequest<void>(query, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      mp_order_id: input.providerOrderId,
      mp_checkout_url: input.checkoutUrl,
      status: "awaiting_payment",
      provider_status: null,
      provider_status_detail: null,
      updated_at: new Date().toISOString(),
    }),
  });
}

export async function markCheckoutError(orderId: string, reason: string) {
  const query = "orders?id=eq." + encodeURIComponent(orderId);
  await supabaseRequest<void>(query, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      status: "checkout_error",
      provider_status_detail: reason.slice(0, 500),
      updated_at: new Date().toISOString(),
    }),
  });
}

export async function applyMercadoPagoEvent(input: {
  eventId: string;
  providerOrderId: string;
  localOrderId: string;
  status: string;
  statusDetail: string;
  totalPaid: number;
  payload: unknown;
}) {
  return supabaseRequest<string>("rpc/apply_mercadopago_order_event", {
    method: "POST",
    body: JSON.stringify({
      p_event_id: input.eventId,
      p_mp_order_id: input.providerOrderId,
      p_external_reference: input.localOrderId,
      p_status: input.status,
      p_status_detail: input.statusDetail,
      p_total_paid: input.totalPaid,
      p_payload: input.payload,
    }),
  });
}


export async function getStoreOrderItems(orderId: string) {
  const query = "order_items?order_id=eq." + encodeURIComponent(orderId)
    + "&select=product_name,color_label,size,quantity,unit_price,line_total";
  const rows = await supabaseRequest<StoreOrderItemRow[]>(query, { method: "GET" });
  return rows.map((row) => ({
    productName: row.product_name,
    colorLabel: row.color_label ?? undefined,
    size: row.size ?? undefined,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    lineTotal: Number(row.line_total),
  }));
}

export async function getStoreOrderStatus(orderId: string) {
  const query = "orders?id=eq." + encodeURIComponent(orderId)
    + "&select=id,status,total_amount&limit=1";
  const rows = await supabaseRequest<StoreOrderStatusRow[]>(query, { method: "GET" });
  const row = rows[0];
  if (!row) return null;
  return { id: row.id, status: row.status, total: Number(row.total_amount) };
}
