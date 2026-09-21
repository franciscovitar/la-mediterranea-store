"use client";

import { formatMoney } from "@/lib/products";

export type CartLine = {
  key: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  colorKey?: string;
  colorLabel?: string;
  size?: string;
};

export function CartDrawer({ lines, open, onClose, onStep, onRemove, onClear, checkoutHref = "/checkout", checkoutNote }: {
  lines: CartLine[];
  open: boolean;
  onClose: () => void;
  onStep: (key: string, delta: number) => void;
  onRemove: (key: string) => void;
  onClear: () => void;
  checkoutHref?: string | null;
  checkoutNote?: string;
}) {
  const total = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  return (
    <>
      <button aria-hidden={!open} aria-label="Cerrar carrito" className={`cart-backdrop ${open ? "is-open" : ""}`} onClick={onClose} tabIndex={open ? 0 : -1} type="button" />
      <aside aria-hidden={!open} aria-label="Carrito" aria-modal="true" className={`cart-drawer ${open ? "is-open" : ""}`} inert={!open} role="dialog">
        <div className="cart-head">
          <div><span className="eyebrow">Tu selección</span><h2>Carrito</h2></div>
          <button aria-label="Cerrar carrito" className="icon-button" onClick={onClose} type="button">×</button>
        </div>
        <div className="cart-body">
          {lines.length === 0 ? (
            <div className="cart-empty"><span aria-hidden="true">♪</span><h3>Tu carrito está vacío</h3><p>Elegí un producto del catálogo para empezar.</p></div>
          ) : lines.map((line) => (
            <article className="cart-line" key={line.key}>
              <img src={line.image} alt="" />
              <div className="cart-line-content">
                <div className="cart-line-top">
                  <div><h3>{line.name}</h3><p>{[line.colorLabel, line.size ? `Talle ${line.size}` : null].filter(Boolean).join(" · ") || "Producto"}</p></div>
                  <strong>{formatMoney(line.price * line.quantity)}</strong>
                </div>
                <div className="cart-line-actions">
                  <div className="quantity" aria-label={`Cantidad de ${line.name}`}>
                    <button aria-label="Restar uno" onClick={() => onStep(line.key, -1)} type="button">−</button>
                    <span>{line.quantity}</span>
                    <button aria-label="Sumar uno" onClick={() => onStep(line.key, 1)} type="button">+</button>
                  </div>
                  <button className="text-button" onClick={() => onRemove(line.key)} type="button">Quitar</button>
                </div>
              </div>
            </article>
          ))}
        </div>
        <div className="cart-foot">
          {lines.length ? (
            <>
              <div className="cart-total"><span>Total</span><strong>{formatMoney(total)}</strong></div>
              {checkoutHref ? (
                <a className="checkout-button" href={checkoutHref}>Finalizar compra</a>
              ) : (
                <button className="checkout-button" disabled type="button">Checkout desactivado</button>
              )}
              <p className="cart-pending">{checkoutNote ?? "Revisá el pedido antes de pasar al pago."}</p>
              <button className="text-button clear-cart" onClick={onClear} type="button">Vaciar carrito</button>
            </>
          ) : <button className="browse-button" onClick={onClose} type="button">Seguir viendo productos</button>}
        </div>
      </aside>
    </>
  );
}
