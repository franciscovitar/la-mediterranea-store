import { getStoreOrderStatus } from "@/lib/integrations/supabase/server";
import { noStoreJson } from "@/lib/http/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const orderId = new URL(request.url).searchParams.get("orderId");
  if (!orderId || !uuid.test(orderId)) {
    return noStoreJson({ error: "Pedido inválido." }, { status: 400 });
  }

  try {
    const order = await getStoreOrderStatus(orderId);
    if (!order) return noStoreJson({ error: "Pedido no encontrado." }, { status: 404 });
    return noStoreJson({ order });
  } catch {
    return noStoreJson({ error: "No se pudo consultar el estado del pedido." }, { status: 502 });
  }
}
