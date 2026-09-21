export default function CheckoutSuccessPage() {
  return (
    <main className="checkout-shell">
      <div className="checkout-page">
        <section className="result-card">
          <span className="eyebrow">Volviste de Mercado Pago</span>
          <h1>Estamos verificando el pago</h1>
          <p>La vuelta desde Mercado Pago no marca el pedido como pagado por sí sola. El estado definitivo se confirma desde la notificación segura del servidor.</p>
          <a href="/">Volver a la tienda</a>
        </section>
      </div>
    </main>
  );
}
