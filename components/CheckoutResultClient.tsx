"use client";

import { useEffect, useMemo, useState } from "react";
import { CART_STORAGE_KEY, CHECKOUT_REQUEST_STORAGE_KEY } from "@/lib/commerce/cart";
import { formatMoney } from "@/lib/products";

type Mode = "success" | "pending" | "failure";
type OrderState = { status: string; total: number } | null;

const terminalStatuses = new Set(["paid", "payment_failed", "checkout_error", "payment_review", "refunded", "partially_refunded"]);

export function CheckoutResultClient({ orderId, mode }: { orderId?: string; mode: Mode }) {
  const [order, setOrder] = useState<OrderState>(null);
  const [checking, setChecking] = useState(Boolean(orderId));

  useEffect(() => {
    if (!orderId) {
      setChecking(false);
      return;
    }
    const stableOrderId: string = orderId;

    let cancelled = false;
    let timer: number | undefined;
    let attempts = 0;

    async function check() {
      attempts += 1;
      try {
        const response = await fetch("/api/checkout/status?orderId=" + encodeURIComponent(stableOrderId), { cache: "no-store" });
        if (response.ok) {
          const data = await response.json() as { order?: { status: string; total: number } };
          if (!cancelled && data.order) {
            setOrder(data.order);
            if (terminalStatuses.has(data.order.status)) {
              setChecking(false);
              return;
            }
          }
        }
      } catch {
        // A transient poll failure must not turn a provider return page into a false final state.
      }

      if (!cancelled && attempts < 12) timer = window.setTimeout(check, 1500);
      else if (!cancelled) setChecking(false);
    }

    void check();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [orderId]);

  useEffect(() => {
    if (order?.status !== "paid") return;
    window.localStorage.removeItem(CART_STORAGE_KEY);
    window.localStorage.removeItem(CHECKOUT_REQUEST_STORAGE_KEY);
  }, [order?.status]);

  const view = useMemo(() => {
    if (order?.status === "paid") {
      return {
        eyebrow: "Pago confirmado",
        title: "¡Gracias por tu compra!",
        text: "Mercado Pago confirmó el pago y tu pedido quedó registrado correctamente.",
        action: "Volver a la tienda",
        href: "/",
        mark: "✓",
        tone: "success",
      };
    }
    if (order?.status === "payment_review") {
      return {
        eyebrow: "Pedido recibido",
        title: "Estamos revisando tu pago",
        text: "El pago llegó, pero necesitamos revisar el pedido antes de confirmarlo. No vuelvas a pagar.",
        action: "Volver a la tienda",
        href: "/",
        mark: "…",
        tone: "pending",
      };
    }
    if (order?.status === "payment_failed" || order?.status === "checkout_error") {
      return {
        eyebrow: "Pago no completado",
        title: "Podés intentarlo nuevamente",
        text: "No tenemos un pago confirmado para este pedido. Tu carrito sigue disponible para volver a intentar.",
        action: "Volver al checkout",
        href: "/checkout",
        mark: "×",
        tone: "failure",
      };
    }
    if (mode === "failure") {
      return {
        eyebrow: "Pago no completado",
        title: "Estamos revisando el resultado",
        text: "Todavía no tenemos una confirmación definitiva. Si el pago termina acreditándose, esta pantalla se actualizará sin que tengas que volver a pagar.",
        action: "Volver al checkout",
        href: "/checkout",
        mark: "…",
        tone: "pending",
      };
    }
    return {
      eyebrow: mode === "pending" ? "Pago pendiente" : "Confirmando el pago",
      title: "Estamos verificando tu pago",
      text: "Tu pedido ya está registrado. Esperamos la confirmación segura de Mercado Pago; no necesitás volver a pagar.",
      action: "Volver a la tienda",
      href: "/",
      mark: "…",
      tone: "pending",
    };
  }, [mode, order?.status]);

  return (
    <section className="result-card">
      <div aria-hidden="true" className={`result-status-mark ${view.tone}`}>{view.mark}</div>
      <span className="eyebrow">{view.eyebrow}</span>
      <h1>{view.title}</h1>
      <p>{view.text}</p>
      {orderId ? <p className="result-order-ref">Pedido #{orderId.slice(0, 8).toUpperCase()}{order ? ` · ${formatMoney(order.total)}` : ""}</p> : null}
      {checking ? <p className="result-checking" aria-live="polite">Actualizando estado…</p> : null}
      <a href={view.href}>{view.action}</a>
    </section>
  );
}
