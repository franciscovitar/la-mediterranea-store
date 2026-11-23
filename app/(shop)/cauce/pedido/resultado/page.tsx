import Link from "next/link";
import { Suspense } from "react";
import { CauceOrderResult } from "@/components/cauce/CauceOrderResult";

export const metadata = { title: "Estado del pedido | Cauce", robots: { index: false, follow: false }, referrer: "no-referrer" as const };

export default function OrderResultPage() {
  return <main className="c-page c-container c-checkout-page">
    <nav className="c-breadcrumb" aria-label="Ubicación"><Link href="/cauce">Inicio</Link><span>/</span><Link href="/cauce/pedido">Pedido</Link><span>/</span><span>Estado</span></nav>
    <div className="c-page-heading"><span className="c-overline">Estado de tu compra</span><h1>Tu pedido.</h1></div>
    <Suspense fallback={<p>Consultando el pedido…</p>}><CauceOrderResult /></Suspense>
  </main>;
}
