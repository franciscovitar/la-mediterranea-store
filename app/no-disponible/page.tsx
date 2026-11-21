import Link from "next/link";

export const metadata = { title: "No disponible | Cauce", robots: { index: false, follow: false } };

export default function Unavailable() {
  return <main className="c-unavailable"><Link className="c-logo" href="/">cauce<span>.</span></Link>
    <span className="c-overline">Volvemos pronto</span><h1>Estamos preparando esta parte de la tienda.</h1>
    <p>Mientras tanto podés recorrer la colección y guardar tus piezas favoritas.</p>
    <Link className="c-button c-button-dark" href="/catalogo">Ver la colección ↗</Link>
  </main>;
}
