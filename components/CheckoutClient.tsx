"use client";

import { useEffect, useState } from "react";
import { CART_STORAGE_KEY, CHECKOUT_REQUEST_STORAGE_KEY, reconcileCart, type CartLine } from "@/lib/commerce/cart";
import { checkoutFingerprint, readStoredCheckoutRequest } from "@/lib/commerce/idempotency";
import { formatMoney, type Product } from "@/lib/products";

type Quote = {
  currency: "ARS";
  lines: Array<{
    key: string;
    productId: string;
    name: string;
    image: string;
    colorKey?: string;
    colorLabel?: string;
    size?: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  total: number;
};

type Readiness = { checkoutReady: boolean };

export function CheckoutClient() {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [buyerEmail, setBuyerEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const catalogResponse = await fetch("/api/catalog", { cache: "no-store" });
        const catalogData = await catalogResponse.json() as { products?: Product[]; error?: string };
        if (!catalogResponse.ok || !catalogData.products) throw new Error(catalogData.error ?? "No se pudo leer el catálogo.");

        const saved = window.localStorage.getItem(CART_STORAGE_KEY);
        const reconciled = saved ? reconcileCart(JSON.parse(saved), catalogData.products) : [];
        if (!cancelled) setCart(reconciled);
        window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(reconciled));

        const lines = reconciled.map((line) => ({
          productId: line.productId,
          colorKey: line.colorKey,
          colorLabel: line.colorLabel,
          size: line.size,
          quantity: line.quantity,
        }));

        const [readinessResponse, quoteResponse] = await Promise.all([
          fetch("/api/integrations/readiness", { cache: "no-store" }),
          lines.length
            ? fetch("/api/checkout/quote", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lines }),
              })
            : Promise.resolve(null),
        ]);

        const readinessData = await readinessResponse.json() as Readiness;
        if (!cancelled) setReadiness(readinessData);

        if (quoteResponse) {
          const data = await quoteResponse.json() as Quote | { error?: string };
          if (!quoteResponse.ok) throw new Error("error" in data ? data.error : "No se pudo revisar el pedido.");
          if (!cancelled) setQuote(data as Quote);
        } else if (!cancelled) {
          setQuote(null);
        }
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "No se pudo cargar el checkout.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  async function startPayment() {
    if (!readiness?.checkoutReady || !quote?.lines.length) return;
    setPaying(true);
    setError("");
    try {
      const canonicalLines = quote.lines.map((line) => ({
        productId: line.productId,
        colorKey: line.colorKey,
        size: line.size,
        quantity: line.quantity,
      }));

      const fingerprint = checkoutFingerprint(canonicalLines, buyerEmail);
      const stored = readStoredCheckoutRequest(window.localStorage.getItem(CHECKOUT_REQUEST_STORAGE_KEY));
      const requestId = stored?.fingerprint === fingerprint ? stored.requestId : crypto.randomUUID();
      if (!stored || stored.requestId !== requestId || stored.fingerprint !== fingerprint) {
        window.localStorage.setItem(CHECKOUT_REQUEST_STORAGE_KEY, JSON.stringify({ requestId, fingerprint }));
      }

      const response = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, buyerEmail, lines: canonicalLines }),
      });
      const data = await response.json() as { checkoutUrl?: string; error?: string };
      if (!response.ok || !data.checkoutUrl) throw new Error(data.error ?? "No se pudo iniciar Mercado Pago.");
      window.location.assign(data.checkoutUrl);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo iniciar el pago.");
      setPaying(false);
    }
  }

  if (loading) {
    return <div className="checkout-card"><p className="checkout-help">Revisando tu pedido…</p></div>;
  }

  if (!cart.length) {
    return (
      <div className="checkout-card checkout-empty">
        <strong>Tu carrito está vacío.</strong>
        <p className="checkout-help">Volvé al catálogo para elegir tus productos.</p>
        <div><a href="/">Ver productos</a></div>
      </div>
    );
  }

  return (
    <div className="checkout-grid">
      <section className="checkout-card">
        <div className="checkout-card-heading">
          <span className="eyebrow">Resumen</span>
          <h2>Tu pedido</h2>
        </div>
        {quote?.lines.map((line) => (
          <article className="checkout-line" key={line.key}>
            <img alt="" src={line.image} />
            <div>
              <h3>{line.name}</h3>
              <p>{[
                line.colorLabel,
                line.size ? "Talle " + line.size : null,
                "Cantidad " + line.quantity,
              ].filter(Boolean).join(" · ")}</p>
            </div>
            <strong>{formatMoney(line.lineTotal)}</strong>
          </article>
        ))}
        {quote ? (
          <div className="checkout-total">
            <span>Total</span>
            <strong>{formatMoney(quote.total)}</strong>
          </div>
        ) : null}
      </section>

      <aside className="checkout-card checkout-payment-card">
        <div className="checkout-card-heading">
          <span className="eyebrow">Pago seguro</span>
          <h2>Finalizar compra</h2>
        </div>
        <p className="checkout-help">Al continuar te llevamos a Mercado Pago para completar el pago. Antes de abrirlo, el pedido y el importe se validan nuevamente.</p>

        <div className="checkout-field">
          <label htmlFor="checkout-email">Email para el comprobante <span>(opcional)</span></label>
          <input
            autoComplete="email"
            id="checkout-email"
            onChange={(event) => setBuyerEmail(event.target.value)}
            placeholder="tu@email.com"
            type="email"
            value={buyerEmail}
          />
        </div>

        <button className="checkout-pay" disabled={!readiness?.checkoutReady || paying || !quote} onClick={startPayment} type="button">
          {paying ? "Abriendo Mercado Pago…" : "Pagar con Mercado Pago"}
        </button>

        <p className="checkout-secure-note"><span aria-hidden="true">✓</span> El estado final del pago se confirma de forma segura desde el servidor.</p>

        {!readiness?.checkoutReady ? (
          <div className="checkout-status checkout-unavailable">
            <strong>Pago online temporalmente no disponible</strong>
            <p>Tu pedido sigue guardado en el carrito. Podés volver más tarde sin tener que armarlo de nuevo.</p>
          </div>
        ) : null}

        {error ? <p className="checkout-error">{error}</p> : null}
      </aside>
    </div>
  );
}
