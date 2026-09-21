"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body>
        <main className="checkout-shell">
          <div className="checkout-page">
            <section className="result-card">
              <span className="eyebrow">Error</span>
              <h1>Algo no salió bien</h1>
              <p>Podés volver a intentar sin perder la intención de compra. Si el problema continúa, volvé al catálogo.</p>
              <button className="checkout-pay" onClick={reset} type="button">Intentar de nuevo</button>
              <a href="/">Volver a la tienda</a>
            </section>
          </div>
        </main>
      </body>
    </html>
  );
}
