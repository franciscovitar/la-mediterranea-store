import Link from "next/link";
import { CauceCheckout } from "@/components/cauce/CauceCheckout";

export const metadata = { title: "Revisar pedido | Cauce", robots: { index: false, follow: false }, referrer: "no-referrer" as const };

export default function OrderPage() {
  return <main className="c-page c-container c-checkout-page">
    <nav className="c-breadcrumb" aria-label="Ubicación"><Link href="/cauce">Inicio</Link><span>/</span><span>Revisar pedido</span></nav>
    <div className="c-page-heading"><span className="c-overline">Tu selección</span><h1>Revisá tu pedido.</h1>
      <p>Confirmá lo que elegiste. Los precios y la disponibilidad se comprueban nuevamente en el servidor.</p></div>
    <CauceCheckout />
  </main>;
}
