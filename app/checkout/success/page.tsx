import { ClearCheckoutState } from "@/components/ClearCheckoutState";

export default function CheckoutSuccessPage() {
  return (
    <main className="checkout-shell">
      <div className="checkout-page">
        <ClearCheckoutState />
        <section className="result-card">
          <span className="eyebrow">Pago informado</span>
          <h1>Gracias por tu compra</h1>
          <p>Mercado Pago te redirigió como pago aprobado. El estado definitivo del pedido se actualiza desde la notificación segura del servidor.</p>
          <a href="/">Volver a la tienda</a>
        </section>
      </div>
    </main>
  );
}
