"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { Product } from "@/lib/products";
import { formatMoney } from "@/lib/products";

export type AddToCartPayload = {
  product: Product;
  colorKey?: string;
  colorLabel?: string;
  size?: string;
  image: string;
  quantity: number;
};

export function ProductCard({ product, onAdd }: { product: Product; onAdd: (payload: AddToCartPayload) => void }) {
  const [colorKey, setColorKey] = useState(product.colors?.[0]?.key);
  const [size, setSize] = useState(product.sizes?.[0]);
  const [justAdded, setJustAdded] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const selectedColor = useMemo(() => product.colors?.find((color) => color.key === colorKey), [colorKey, product.colors]);
  const image = selectedColor?.image ?? product.image;

  function addProduct() {
    onAdd({ product, colorKey: selectedColor?.key, colorLabel: selectedColor?.label, size, image, quantity });
    setQuantity(1);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 900);
  }

  return (
    <article className="product-card">
      <div className="product-image-wrap">
        <img className="product-image" src={image} alt={product.name} loading="lazy" />
        <span className="product-category">{product.category}</span>
      </div>
      <div className="product-content">
        <div>
          <h3>{product.name}</h3>
          <p className="product-description">{product.description}</p>
        </div>
        {product.colors?.length ? (
          <fieldset className="option-group">
            <legend>Color: {selectedColor?.label}</legend>
            <div className="swatches" role="radiogroup" aria-label={`Color de ${product.name}`}>
              {product.colors.map((color) => (
                <button
                  aria-checked={color.key === colorKey}
                  aria-label={color.label}
                  className={`swatch ${color.key === colorKey ? "is-selected" : ""}`}
                  key={color.key}
                  onClick={() => setColorKey(color.key)}
                  role="radio"
                  style={{ "--swatch": color.swatch } as CSSProperties}
                  type="button"
                  title={color.label}
                />
              ))}
            </div>
          </fieldset>
        ) : null}
        {product.sizes?.length ? (
          <fieldset className="option-group">
            <legend>Talle</legend>
            <div className="size-options" role="radiogroup" aria-label={`Talle de ${product.name}`}>
              {product.sizes.map((option) => (
                <button aria-checked={option === size} className={option === size ? "is-selected" : ""} key={option} onClick={() => setSize(option)} role="radio" type="button">
                  {option}
                </button>
              ))}
            </div>
          </fieldset>
        ) : null}
        {product.note ? <p className="product-note">{product.note}</p> : null}
        <div className="product-bottom">
          <strong className="product-price">{formatMoney(product.price)}</strong>
          <div className="product-buy-controls">
            <div className="product-quantity" role="group" aria-label={`Cantidad de ${product.name}`}>
              <button aria-label="Restar uno" disabled={quantity === 1} onClick={() => setQuantity((current) => Math.max(1, current - 1))} type="button">−</button>
              <span aria-live="polite">{quantity}</span>
              <button aria-label="Sumar uno" disabled={quantity === 99} onClick={() => setQuantity((current) => Math.min(99, current + 1))} type="button">+</button>
            </div>
            <button className="add-button" onClick={addProduct} type="button">{justAdded ? "Agregado ✓" : "Agregar"}</button>
          </div>
        </div>
      </div>
    </article>
  );
}
