"use client";

import { useState } from "react";
import { useCauceCart } from "./CauceCartProvider";
import type { CauceProduct } from "@/lib/cauce/catalog";

export function ProductPurchase({ product }: { product: CauceProduct }) {
  const [quantity, setQuantity] = useState(1);
  const { add, isSaved, toggleSaved, open } = useCauceCart();
  const saved = isSaved(product.id);
  const max = product.stock === undefined ? 99 : Math.min(product.stock, 99);
  return <div className="c-purchase">
    <div className="c-purchase-actions">
      <div className="c-quantity" role="group" aria-label="Elegir cantidad">
        <button type="button" aria-label="Restar una unidad" disabled={quantity === 1 || max === 0} onClick={() => setQuantity((n) => Math.max(1, n - 1))}>−</button><span aria-live="polite">{quantity}</span><button type="button" aria-label="Sumar una unidad" disabled={quantity >= max} onClick={() => setQuantity((n) => Math.min(max, n + 1))}>+</button>
      </div>
      <button className="c-button c-button-dark" type="button" disabled={max === 0} onClick={() => { add(product, quantity); setQuantity(1); }}>{max === 0 ? "Sin disponibilidad" : "Agregar al carrito"} <span aria-hidden="true">↗</span></button>
      <button className={`c-detail-heart ${saved ? "is-saved" : ""}`} type="button" aria-pressed={saved} aria-label={saved ? "Quitar de guardados" : "Guardar producto"} onClick={() => toggleSaved(product.id)}>{saved ? "♥" : "♡"}</button>
    </div>
    <button className="c-purchase-open" type="button" onClick={open}>Ver mi carrito →</button>
  </div>;
}
