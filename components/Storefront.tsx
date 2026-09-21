"use client";

import { useEffect, useMemo, useState } from "react";
import { CartDrawer } from "@/components/CartDrawer";
import { ProductCard, type AddToCartPayload } from "@/components/ProductCard";
import { formatMoney, products as baseProducts, type Product } from "@/lib/products";
import { CART_STORAGE_KEY, reconcileCart, type CartLine } from "@/lib/commerce/cart";

function lineKey(payload: AddToCartPayload) {
  return [payload.product.id, payload.colorKey ?? "", payload.size ?? ""].join("|");
}

type StorefrontProps = {
  catalog?: Product[];
  cartStorageKey?: string;
  checkoutHref?: string | null;
  previewMode?: boolean;
};

export function Storefront({
  catalog = baseProducts,
  cartStorageKey = CART_STORAGE_KEY,
  checkoutHref = "/checkout",
  previewMode = false,
}: StorefrontProps = {}) {
  const [category, setCategory] = useState("Todos");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(cartStorageKey);
      if (saved) setCart(reconcileCart(JSON.parse(saved), catalog));
    } catch {
      window.localStorage.removeItem(cartStorageKey);
    } finally {
      setHydrated(true);
    }
  }, [cartStorageKey, catalog]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(cartStorageKey, JSON.stringify(cart));
  }, [cart, cartStorageKey, hydrated]);

  useEffect(() => {
    document.body.classList.toggle("cart-is-open", cartOpen);
    if (!cartOpen) return () => document.body.classList.remove("cart-is-open");

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCartOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.classList.remove("cart-is-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [cartOpen]);

  const activeProducts = useMemo(
    () => catalog.filter((product) => product.active),
    [catalog],
  );
  const categories = useMemo(
    () => Array.from(new Set(activeProducts.map((product) => product.category))),
    [activeProducts],
  );
  const visibleProducts = useMemo(
    () => category === "Todos" ? activeProducts : activeProducts.filter((product) => product.category === category),
    [activeProducts, category],
  );

  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const cartTotal = cart.reduce((sum, line) => sum + line.quantity * line.price, 0);

  function addToCart(payload: AddToCartPayload) {
    const key = lineKey(payload);
    setCart((current) => {
      const found = current.find((line) => line.key === key);
      if (found) {
        return current.map((line) => line.key === key ? { ...line, quantity: line.quantity + payload.quantity } : line);
      }
      return [...current, {
        key,
        productId: payload.product.id,
        name: payload.product.name,
        price: payload.product.price,
        quantity: payload.quantity,
        image: payload.image,
        colorKey: payload.colorKey,
        colorLabel: payload.colorLabel,
        size: payload.size,
      }];
    });
  }

  function stepLine(key: string, delta: number) {
    setCart((current) => current
      .map((line) => line.key === key ? { ...line, quantity: line.quantity + delta } : line)
      .filter((line) => line.quantity > 0));
  }

  return (
    <>
      {previewMode ? (
        <div className="draft-preview-strip">
          <div className="container">
            <strong>Vista previa del catálogo real</strong>
            <span>El checkout está desactivado en esta vista administrativa.</span>
            <a href="/admin">Volver al panel</a>
          </div>
        </div>
      ) : null}
      <header className="topbar">
        <div className="container topbar-inner">
          <a className="brand" href="#inicio" aria-label="Ir al inicio">
            <img src="/brand/logo.png" alt="" />
            <span>La Mediterránea</span>
          </a>
          <nav className="topbar-actions" aria-label="Navegación principal">
            <a className="catalog-link" href="#productos">Productos</a>
            <button className="cart-button" onClick={() => setCartOpen(true)} type="button">
              <span>Carrito</span><b>{itemCount}</b>
            </button>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero" id="inicio">
          <div className="hero-orb hero-orb-one" aria-hidden="true" />
          <div className="hero-orb hero-orb-two" aria-hidden="true" />
          <div className="container hero-grid">
            <div className="hero-copy">
              <span className="eyebrow"><i /> Tienda oficial</span>
              <h1>Merchandising que acompaña la música.</h1>
              <p>Elegí tus productos de La Mediterránea y apoyá el futuro de la educación musical.</p>
              <div className="hero-actions">
                <a className="primary-button" href="#productos">Ver catálogo</a>
                <a className="secondary-button" href="#proyecto">Conocer el proyecto</a>
              </div>
              <div className="hero-proof" aria-label="Características de la tienda">
                <span>Catálogo oficial</span><span>Precios actualizados</span><span>Compra simple</span>
              </div>
            </div>
            <div className="hero-card" aria-label="Selección destacada">
              <div className="hero-logo"><img src="/brand/logo.png" alt="La Mediterránea" /></div>
              <div className="mini-products" aria-hidden="true">
                {activeProducts.slice(0, 4).map((product) => (
                  <div className="mini-product" key={product.id}><img src={product.image} alt="" /></div>
                ))}
              </div>
              <p><strong>Una compra, dos impactos.</strong><br />Te llevás algo de La Mediterránea y acompañás un proyecto educativo.</p>
            </div>
          </div>
        </section>

        <section className="impact-strip" aria-label="Impacto del proyecto">
          <div className="container impact-strip-inner">
            <span>♪</span>
            <p>Cada compra apoya la educación musical y transforma el futuro de muchos chicos.</p>
          </div>
        </section>

        <section className="store-section" id="productos">
          <div className="container">
            <div className="section-heading">
              <div><span className="eyebrow"><i /> Catálogo</span><h2>Encontrá el tuyo</h2></div>
              <p>{activeProducts.length} productos del catálogo actual, con los precios publicados en la web vigente.</p>
            </div>

            <div className="category-filter" aria-label="Filtrar por categoría">
              {["Todos", ...categories].map((option) => (
                <button aria-pressed={category === option} className={category === option ? "is-selected" : ""} key={option} onClick={() => setCategory(option)} type="button">
                  {option}
                </button>
              ))}
            </div>

            <div className="catalog-status" aria-live="polite">
              <span>{visibleProducts.length} {visibleProducts.length === 1 ? "producto" : "productos"}</span>
              {itemCount > 0 ? <button onClick={() => setCartOpen(true)} type="button">Ver carrito · {formatMoney(cartTotal)}</button> : null}
            </div>

            <div className="product-grid">
              {visibleProducts.map((product) => <ProductCard key={product.id} onAdd={addToCart} product={product} />)}
            </div>
          </div>
        </section>

        <section className="about" id="proyecto">
          <div className="container about-grid">
            <div className="about-mark" aria-hidden="true">♪</div>
            <div>
              <span className="eyebrow light"><i /> Más que merchandising</span>
              <h2>Apoyás la música.<br />Transformás futuros.</h2>
              <p>La tienda conserva el espíritu de la preventa original: acercar productos de La Mediterránea de una forma clara, simple y cercana, mientras cada compra acompaña el proyecto educativo.</p>
              <a href="#productos">Volver al catálogo <span aria-hidden="true">→</span></a>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="container footer-inner">
          <a className="brand footer-brand" href="#inicio"><img src="/brand/logo.png" alt="" /><span>La Mediterránea</span></a>
          <p>Orquesta-Escuela Infantil y Juvenil</p>
          <a href="#productos">Tienda oficial ↑</a>
        </div>
      </footer>

      {itemCount > 0 ? (
        <button className="floating-cart" onClick={() => setCartOpen(true)} type="button">
          <span>Carrito · {itemCount}</span><strong>{formatMoney(cartTotal)}</strong>
        </button>
      ) : null}

      <CartDrawer
        lines={cart}
        onClear={() => setCart([])}
        onClose={() => setCartOpen(false)}
        onRemove={(key) => setCart((current) => current.filter((line) => line.key !== key))}
        onStep={stepLine}
        checkoutHref={checkoutHref}
        checkoutNote={previewMode ? "El checkout está desactivado en la vista previa administrativa." : undefined}
        open={cartOpen}
      />
    </>
  );
}
