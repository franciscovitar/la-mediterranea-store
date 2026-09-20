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
        <p className="checkout-lead">Esta pantalla ya usa un cálculo de precios del lado del servidor y está lista para enchufar la base de datos y Mercado Pago cuando tengamos los accesos.</p>
        <CheckoutClient />
      </div>
    </main>
  );
}
