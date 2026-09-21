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

type Readiness = {
  supabaseServer: boolean;
  supabasePublic: boolean;
  mercadoPagoApi: boolean;
  mercadoPagoWebhook: boolean;
  siteUrl: boolean;
  checkoutReady: boolean;
  productionReady: boolean;
  missingForCheckout: string[];
};

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
        const lines = reconciled.map((line) => ({ productId: line.productId, colorKey: line.colorKey, colorLabel: line.colorLabel, size: line.size, quantity: line.quantity }));
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
    load();
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
        body: JSON.stringify({
          requestId,
          buyerEmail,
          lines: canonicalLines,
        }),
      });
      const data = await response.json() as { checkoutUrl?: string; error?: string };
      if (!response.ok || !data.checkoutUrl) {
        throw new Error(data.error ?? "No se pudo iniciar Mercado Pago.");
      }
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
        <div><a href="/">Volver al catálogo</a></div>
      </div>
    );
  }

  return (
    <div className="checkout-grid">
      <section className="checkout-card">
        <h2>Tu pedido</h2>
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

      <aside className="checkout-card">
        <h2>Finalizar compra</h2>
        <p className="checkout-help">El precio se vuelve a calcular en el servidor. El navegador no decide cuánto se cobra.</p>

        <div className="checkout-field">
          <label htmlFor="checkout-email">Email (opcional)</label>
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

        {!readiness?.checkoutReady ? (
          <div className="checkout-status">
            <strong>Checkout preparado, todavía no conectado</strong>
            <p>Cuando estén las cuentas, se cargan las credenciales y se aplica la base. No hace falta rehacer esta pantalla.</p>
          </div>
        ) : null}

        <div className="integration-grid" aria-label="Estado de integraciones">
          <div className="integration-row"><span>Base de datos</span><b className={readiness?.supabaseServer ? "ready" : "pending"}>{readiness?.supabaseServer ? "Lista" : "Pendiente"}</b></div>
          <div className="integration-row"><span>Mercado Pago</span><b className={readiness?.mercadoPagoApi ? "ready" : "pending"}>{readiness?.mercadoPagoApi ? "Listo" : "Pendiente"}</b></div>
          <div className="integration-row"><span>Webhook seguro</span><b className={readiness?.mercadoPagoWebhook ? "ready" : "pending"}>{readiness?.mercadoPagoWebhook ? "Listo" : "Pendiente"}</b></div>
        </div>

        {error ? <p className="checkout-error">{error}</p> : null}
      </aside>
    </div>
  );
}
