import { CheckoutClient } from "@/components/CheckoutClient";

export default function CheckoutPage() {
  return (
    <main className="checkout-shell">
      <div className="checkout-page">
        <header className="checkout-header">
          <a className="brand" href="/"><img alt="" src="/brand/logo.png" /><span>La Mediterránea</span></a>
          <a className="checkout-back" href="/">← Seguir viendo productos</a>
        </header>
        <h1 className="checkout-title">Revisá tu pedido</h1>
        <p className="checkout-lead">Confirmá que esté todo bien y seguí a Mercado Pago para completar la compra.</p>
        <CheckoutClient />
      </div>
    </main>
  );
}
