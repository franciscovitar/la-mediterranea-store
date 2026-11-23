"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCauceCart } from "@/components/cauce/CauceCartProvider";
import { safeTestCheckoutUrl } from "@/lib/cauce/checkout";
import { formatMoney } from "@/lib/products";

type Quote = { currency: "ARS"; total: number; sandboxEnabled: boolean;
  items: Array<{ productId: string; name: string; quantity: number; unitPrice: number; amount: number }> };

export function CauceCheckout() {
  const { lines, ready } = useCauceCart();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const quoteSequence = useRef(0);
  const payload = useMemo(() => lines.map(({ productId, quantity }) => ({ productId, quantity })), [lines]);
  const cartKey = JSON.stringify(payload);

  const refresh = useCallback(async () => {
    const sequence = ++quoteSequence.current;
    setLoading(true);
    setQuote(null);
    setError("");
    try {
      const response = await fetch("/api/cauce/checkout/quote", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lines: payload }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No pudimos revisar la selección.");
      if (sequence === quoteSequence.current) setQuote(result);
    } catch (reason) {
      if (sequence === quoteSequence.current) setError(reason instanceof Error ? reason.message : "Error al cotizar.");
    } finally { if (sequence === quoteSequence.current) setLoading(false); }
  }, [payload]);

  useEffect(() => { if (ready && lines.length) void refresh(); else if (ready) setLoading(false); }, [ready, lines.length, refresh]);

  async function pay() {
    if (!quote?.sandboxEnabled || starting) return;
    setStarting(true);
    setError("");
    try {
      const saved = sessionStorage.getItem("cauce-checkout-request-v1");
      const last = saved ? JSON.parse(saved) as { cartKey?: string; key?: string } : {};
      const requestKey = last.cartKey === cartKey && typeof last.key === "string" ? last.key : crypto.randomUUID();
      sessionStorage.setItem("cauce-checkout-request-v1", JSON.stringify({ cartKey, key: requestKey }));
      const response = await fetch("/api/cauce/checkout/create", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify({ lines: payload, requestKey }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409 && typeof result.error === "string" && result.error.includes("expiró")) {
          sessionStorage.removeItem("cauce-checkout-request-v1");
        }
        throw new Error(result.error ?? "No se pudo comenzar el pago.");
      }
      window.location.assign(safeTestCheckoutUrl(result.checkoutUrl));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Error al iniciar el pago."); setStarting(false); }
  }

  if (!ready) return <p className="c-merchant-muted">Cargando carrito…</p>;
  if (!lines.length) return <section className="c-review-empty"><h2>Tu carrito está vacío.</h2><p>Elegí algo de la colección para armar tu pedido.</p>
    <Link className="c-button c-button-dark" href="/cauce/catalogo">Ver productos ↗</Link></section>;

  return <div className="c-review-layout">
    <section className="c-review-card" aria-label="Productos seleccionados"><h2>Productos</h2>
      {lines.map((line) => <div className="c-review-item" key={line.key}><img src={line.image} alt="" />
        <div><h3>{line.name}</h3><p>{line.quantity} {line.quantity === 1 ? "unidad" : "unidades"}</p></div>
        <strong>{formatMoney(line.price * line.quantity)}</strong></div>)}
      <Link className="c-text-link" href="/cauce/catalogo">Seguir explorando ↗</Link>
    </section>
    <section className="c-review-card c-review-summary" aria-label="Resumen del pedido"><h2>Resumen</h2>
      {loading ? <p role="status">Verificando precios y stock…</p> : quote ? <>
        {quote.items.map((item) => <div className="c-review-total-row" key={item.productId}><span>{item.name} × {item.quantity}</span><span>{formatMoney(item.amount)}</span></div>)}
        <div className="c-review-total-row c-review-total"><strong>Total estimado</strong><strong>{formatMoney(quote.total)}</strong></div>
        {quote.sandboxEnabled ? <><p className="c-review-note">Entorno de demostración · Solo tarjetas de prueba. No se aceptan pagos reales.</p>
          <button className="c-button c-button-dark" disabled={starting} onClick={() => void pay()} type="button">{starting ? "Preparando…" : "Pagar con tarjeta de prueba ↗"}</button></> :
          <p className="c-review-not-ready">El pago de prueba todavía no está disponible. Tu selección sigue guardada en el carrito.</p>}
      </> : <p>Revisá los productos e intentá nuevamente.</p>}
      {error && <p role="alert" className="c-merchant-feedback is-error">{error}</p>}
      {!loading && error && <button type="button" onClick={() => void refresh()} className="c-text-link">Volver a verificar</button>}
    </section>
  </div>;
}
