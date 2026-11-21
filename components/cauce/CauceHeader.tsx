"use client";

import Link from "next/link";
import { useState } from "react";
import { useCauceCart } from "./CauceCartProvider";

export function CauceHeader() {
  const { count, savedCount, open } = useCauceCart();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <div className="c-announcement">Piezas para vivir tus espacios, a tu manera <span aria-hidden="true">✳</span> Colección Casa 2026</div>
      <header className="c-header">
        <div className="c-container c-header-row">
          <button className="c-menu-toggle" aria-expanded={menuOpen} aria-controls="c-mobile-menu" aria-label="Abrir menú" onClick={() => setMenuOpen((value) => !value)} type="button">
            <span /><span /><span />
          </button>
          <Link className="c-logo" href="/" aria-label="Cauce, inicio">cauce<span>.</span></Link>
          <nav className="c-nav" aria-label="Navegación principal">
            <Link href="/catalogo">Tienda</Link>
            <Link href="/catalogo?categoria=Mesa">Mesa</Link>
            <Link href="/catalogo?categoria=Decoraci%C3%B3n">Decoración</Link>
            <Link href="/catalogo?categoria=Textiles">Textiles</Link>
            <Link href="/#nosotros">Nosotros</Link>
          </nav>
          <div className="c-header-actions">
            <Link className="c-icon-action" href="/catalogo" aria-label="Buscar productos" title="Buscar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>
            </Link>
            <Link className="c-icon-action c-saved-action" href="/favoritos" aria-label={`Guardados, ${savedCount} productos`} title="Guardados">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M20.5 8c0 5.2-8.5 11-8.5 11S3.5 13.2 3.5 8a4.5 4.5 0 0 1 8.5-2.1A4.5 4.5 0 0 1 20.5 8Z"/></svg>
              {savedCount ? <span className="c-action-count">{savedCount}</span> : null}
            </Link>
            <button className="c-icon-action c-cart-action" aria-label={`Abrir carrito, ${count} productos`} onClick={open} type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4.5 8h15l-1.3 12H5.8L4.5 8ZM8.5 9V6a3.5 3.5 0 0 1 7 0v3"/></svg>
              <span className="c-action-count">{count}</span>
            </button>
          </div>
        </div>
        <nav id="c-mobile-menu" className={`c-mobile-nav ${menuOpen ? "is-open" : ""}`} aria-label="Menú móvil" inert={!menuOpen}>
          <Link href="/catalogo" onClick={() => setMenuOpen(false)}>Todos los productos</Link>
          <Link href="/catalogo?categoria=Mesa" onClick={() => setMenuOpen(false)}>Mesa</Link>
          <Link href="/catalogo?categoria=Decoraci%C3%B3n" onClick={() => setMenuOpen(false)}>Decoración</Link>
          <Link href="/catalogo?categoria=Textiles" onClick={() => setMenuOpen(false)}>Textiles</Link>
          <Link href="/favoritos" onClick={() => setMenuOpen(false)}>Mis guardados</Link>
        </nav>
      </header>
    </>
  );
}
