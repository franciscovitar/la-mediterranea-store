export default function CheckoutPendingPage() {
  return (
    <main className="checkout-shell">
      <div className="checkout-page">
        <section className="result-card">
          <span className="eyebrow">Pago pendiente</span>
          <h1>Estamos esperando la confirmación</h1>
          <p>Tu pedido queda registrado y el servidor actualizará su estado cuando Mercado Pago confirme el resultado.</p>
          <a href="/">Volver a la tienda</a>
        </section>
      </div>
    </main>
  );
}
