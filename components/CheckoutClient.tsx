"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { CART_STORAGE_KEY, CHECKOUT_REQUEST_STORAGE_KEY, reconcileCart, type CartLine } from "@/lib/commerce/cart";
import { checkoutFingerprint, readStoredCheckoutRequest } from "@/lib/commerce/idempotency";
import type { FulfillmentMethod } from "@/lib/commerce/buyer";
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
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerNotes, setBuyerNotes] = useState("");
  const [fulfillmentMethod, setFulfillmentMethod] = useState<FulfillmentMethod | "">("");
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

  async function startPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!readiness?.checkoutReady || !quote?.lines.length || !fulfillmentMethod) return;
    setPaying(true);
    setError("");
    try {
      const canonicalLines = quote.lines.map((line) => ({
        productId: line.productId,
        colorKey: line.colorKey,
        size: line.size,
        quantity: line.quantity,
      }));
      const buyer = { buyerName, buyerPhone, buyerEmail, buyerNotes, fulfillmentMethod };
      const fingerprint = checkoutFingerprint(canonicalLines, buyer);
      const stored = readStoredCheckoutRequest(window.localStorage.getItem(CHECKOUT_REQUEST_STORAGE_KEY));
      const requestId = stored?.fingerprint === fingerprint ? stored.requestId : crypto.randomUUID();
      if (!stored || stored.requestId !== requestId || stored.fingerprint !== fingerprint) {
        window.localStorage.setItem(CHECKOUT_REQUEST_STORAGE_KEY, JSON.stringify({ requestId, fingerprint }));
      }

      const response = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, ...buyer, lines: canonicalLines }),
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

      <form className="checkout-card checkout-payment-card" onSubmit={startPayment}>
        <div className="checkout-card-heading">
          <span className="eyebrow">Datos y pago</span>
          <h2>Finalizar compra</h2>
        </div>
        <p className="checkout-help">Completá tus datos. Después te llevamos a Mercado Pago para realizar el pago.</p>

        <div className="checkout-contact-grid">
          <div className="checkout-field">
            <label htmlFor="checkout-name">Nombre y apellido <b aria-hidden="true">*</b></label>
            <input
              autoComplete="name"
              id="checkout-name"
              maxLength={120}
              onChange={(event) => setBuyerName(event.target.value)}
              placeholder="Ej: María José Pérez"
              required
              type="text"
              value={buyerName}
            />
          </div>

          <div className="checkout-field">
            <label htmlFor="checkout-phone">Teléfono / WhatsApp <b aria-hidden="true">*</b></label>
            <input
              autoComplete="tel"
              id="checkout-phone"
              inputMode="tel"
              maxLength={40}
              onChange={(event) => setBuyerPhone(event.target.value)}
              placeholder="Ej: 351555-1234"
              required
              type="tel"
              value={buyerPhone}
            />
          </div>

          <div className="checkout-field">
            <label htmlFor="checkout-email">Email <b aria-hidden="true">*</b> <span>(para recibir confirmación)</span></label>
            <input
              autoComplete="email"
              id="checkout-email"
              maxLength={254}
              onChange={(event) => setBuyerEmail(event.target.value)}
              placeholder="tu@email.com"
              required
              type="email"
              value={buyerEmail}
            />
          </div>

          <fieldset className="checkout-field checkout-fulfillment">
            <legend>¿Cómo lo recibís? <b aria-hidden="true">*</b></legend>
            <div className="fulfillment-options">
              <label className={fulfillmentMethod === "pickup" ? "is-selected" : ""}>
                <input
                  checked={fulfillmentMethod === "pickup"}
                  name="fulfillment"
                  onChange={() => setFulfillmentMethod("pickup")}
                  required
                  type="radio"
                  value="pickup"
                />
                <span><strong>Retiro</strong><small>Coordinamos punto y horario por WhatsApp.</small></span>
              </label>
              <label className={fulfillmentMethod === "delivery" ? "is-selected" : ""}>
                <input
                  checked={fulfillmentMethod === "delivery"}
                  name="fulfillment"
                  onChange={() => setFulfillmentMethod("delivery")}
                  required
                  type="radio"
                  value="delivery"
                />
                <span><strong>Entrega a coordinar</strong><small>Coordinamos los detalles por WhatsApp.</small></span>
              </label>
            </div>
          </fieldset>

          <div className="checkout-field">
            <label htmlFor="checkout-notes">Observaciones <span>(opcional)</span></label>
            <textarea
              id="checkout-notes"
              maxLength={1000}
              onChange={(event) => setBuyerNotes(event.target.value)}
              placeholder="Ej: prefiero retirar el finde, dudas de talle, etc."
              rows={4}
              value={buyerNotes}
            />
          </div>
        </div>

        <button className="checkout-pay" disabled={!readiness?.checkoutReady || paying || !quote} type="submit">
          {paying ? "Abriendo Mercado Pago…" : "Pagar con Mercado Pago"}
        </button>

        <p className="checkout-secure-note"><span aria-hidden="true">✓</span> El importe y el estado final del pago se confirman de forma segura desde el servidor.</p>

        {!readiness?.checkoutReady ? (
          <div className="checkout-status checkout-unavailable">
            <strong>Pago online temporalmente no disponible</strong>
            <p>Tu carrito sigue guardado. Podés volver más tarde sin tener que armarlo de nuevo.</p>
          </div>
        ) : null}

        {error ? <p className="checkout-error">{error}</p> : null}
      </form>
    </div>
  );
}
