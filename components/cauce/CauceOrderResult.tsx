"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatMoney } from "@/lib/products";
import { useCauceCart } from "@/components/cauce/CauceCartProvider";

type OrderStatus = { id: string; status: string; total: number; currency: "ARS"; expiresAt: string };

export function CauceOrderResult() {
  const params = useSearchParams();
  const { clear } = useCauceCart();
  const [state, setState] = useState<OrderStatus | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const orderId = params.get("order") ?? "";
  const key = params.get("key") ?? "";

  const refresh = useCallback(async () => {
    setPending(true);
    setError("");
    try {
      const query = new URLSearchParams({ order: orderId, key });
      const response = await fetch(`/api/cauce/checkout/status?${query}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se encontró el pedido.");
      setState(result);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Error al revisar el pedido."); }
    finally { setPending(false); }
  }, [orderId, key]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (state?.status === "paid_test" || state?.status === "failed_test" || state?.status === "cancelled" || state?.status === "expired_test") {
      sessionStorage.removeItem("cauce-checkout-request-v1");
    }
    if (state?.status === "paid_test") clear();
  }, [state?.status, clear]);

  const messages: Record<string, { title: string; description: string }> = {
    paid_test: { title: "Pago de prueba confirmado", description: "Mercado Pago validó este pago de prueba y el servidor actualizó el inventario." },
    expired_test: { title: "El intento de pago venció", description: "La reserva terminó y el stock vuelve a quedar disponible para otros pedidos. No hubo un pago confirmado." },
    pending: { title: "Estamos verificando el pago", description: "Volvé a consultar en unos instantes. La pantalla de retorno no confirma el pago por sí sola." },
    failed_test: { title: "El pago de prueba no fue aprobado", description: "Podés volver a la colección. No se confirmó ninguna compra." },
    needs_review: { title: "El pedido necesita revisión", description: "La confirmación requiere intervención del equipo. No se puede dar por pagado desde esta pantalla." },
    cancelled: { title: "Pedido cancelado", description: "La reserva ya no está activa." },
  };
  const presentation = messages[state?.status ?? ""] ?? messages.pending;

  return <section className="c-review-card c-order-result" aria-live="polite">
    {state ? <><span className="c-overline">{state.id.slice(0, 8)} · Pedido de demostración</span><h2>{presentation.title}</h2>
      <p>{presentation.description}</p><p>Total registrado: <strong>{formatMoney(state.total)}</strong></p></> :
      <><h2>Consultando el pedido</h2><p>Esperá mientras verificamos su estado.</p></>}
    {error && <p role="alert" className="c-merchant-feedback is-error">{error}</p>}
    <div className="c-result-actions"><button className="c-button c-button-dark" type="button" disabled={pending} onClick={() => void refresh()}>{pending ? "Consultando…" : "Actualizar estado"}</button>
      <Link className="c-text-link" href="/catalogo">Volver a la tienda ↗</Link></div>
  </section>;
}
