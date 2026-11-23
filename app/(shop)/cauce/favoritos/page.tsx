import type { Metadata } from "next";
import Link from "next/link";
import { SavedProducts } from "@/components/cauce/SavedProducts";

export const metadata: Metadata = { title: "Mis guardados | Cauce", description: "Tus productos guardados de Cauce." };

export default function SavedPage() {
  return <main className="c-page"><div className="c-container">
    <div className="c-breadcrumb"><Link href="/cauce">Inicio</Link><span>/</span><span>Mis guardados</span></div>
    <div className="c-page-heading"><span className="c-overline">Tu selección personal</span><h1>Los que te gustaron.</h1><p>Todas esas piezas que querés volver a mirar, en un solo lugar.</p></div>
    <SavedProducts />
  </div></main>;
}
