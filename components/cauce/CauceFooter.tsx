import Link from "next/link";

export function CauceFooter() {
  return (
    <footer className="c-footer">
      <div className="c-container c-footer-main">
        <div className="c-footer-about"><Link href="/" className="c-logo">cauce<span>.</span></Link>
          <p>Objetos que acompañan tus rituales de todos los días. Diseñados para quedarse.</p>
        </div>
        <div><h3>Explorá</h3><Link href="/catalogo">Todos los productos</Link><Link href="/catalogo?categoria=Mesa">Mesa</Link><Link href="/catalogo?categoria=Textiles">Textiles</Link><Link href="/favoritos">Mis guardados</Link></div>
        <div><h3>Información</h3><Link href="/#nosotros">Sobre Cauce</Link><Link href="/catalogo">Colección Casa</Link><span>Atención al cliente próximamente</span></div>
      </div>
      <div className="c-container c-footer-bottom"><span>© {new Date().getFullYear()} Cauce. Colección conceptual.</span><span>Hecho con tiempo, pensado para durar.</span></div>
    </footer>
  );
}
