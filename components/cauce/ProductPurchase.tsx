"use client";

import { useState } from "react";
import { useCauceCart } from "./CauceCartProvider";
import type { CauceProduct } from "@/lib/cauce/catalog";

export function ProductPurchase({ product }: { product: CauceProduct }) {
  const [quantity, setQuantity] = useState(1);
  const { add, isSaved, toggleSaved, open } = useCauceCart();
  const saved = isSaved(product.id);
  return <div className="c-purchase">
    <div className="c-purchase-actions">
      <div className="c-quantity" role="group" aria-label="Elegir cantidad">
        <button type="button" aria-label="Restar una unidad" disabled={quantity === 1} onClick={() => setQuantity((n) => Math.max(1, n - 1))}>−</button><span aria-live="polite">{quantity}</span><button type="button" aria-label="Sumar una unidad" disabled={quantity === 99} onClick={() => setQuantity((n) => Math.min(99, n + 1))}>+</button>
      </div>
      <button className="c-button c-button-dark" type="button" onClick={() => { add(product, quantity); setQuantity(1); }}>Agregar al carrito <span aria-hidden="true">↗</span></button>
      <button className={`c-detail-heart ${saved ? "is-saved" : ""}`} type="button" aria-pressed={saved} aria-label={saved ? "Quitar de guardados" : "Guardar producto"} onClick={() => toggleSaved(product.id)}>{saved ? "♥" : "♡"}</button>
    </div>
    <button className="c-purchase-open" type="button" onClick={open}>Ver mi carrito →</button>
  </div>;
}
