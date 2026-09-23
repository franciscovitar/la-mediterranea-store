"use client";

export default function StoreError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="checkout-shell">
      <div className="checkout-page">
        <section className="result-card">
          <div aria-hidden="true" className="result-status-mark failure">!</div>
          <span className="eyebrow">No pudimos cargar la tienda</span>
          <h1>Probemos de nuevo</h1>
          <p>No se perdió ningún dato de tu navegador. Podés reintentar ahora o volver a entrar a la tienda.</p>
          <button className="checkout-pay" onClick={reset} type="button">Reintentar</button>
          <a href="/">Volver al inicio</a>
        </section>
      </div>
    </main>
  );
}
