export default function CheckoutFailurePage() {
  return (
    <main className="checkout-shell">
      <div className="checkout-page">
        <section className="result-card">
          <span className="eyebrow">Pago no completado</span>
          <h1>No se pudo completar el pago</h1>
          <p>Podés volver al carrito y probar nuevamente. El pedido no se marca como pagado desde el navegador.</p>
          <a href="/checkout">Volver al checkout</a>
        </section>
      </div>
    </main>
  );
}
