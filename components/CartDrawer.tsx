"use client";

import { useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";
import { formatMoney } from "@/lib/products";
import type { CartLine } from "@/lib/commerce/cart";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

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
  const drawerRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const total = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
      return () => window.cancelAnimationFrame(frame);
    }
    if (previousFocusRef.current?.isConnected) previousFocusRef.current.focus();
    previousFocusRef.current = null;
  }, [open]);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;

    const focusables = Array.from(drawerRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])
      .filter((element) => element.offsetParent !== null);
    if (!focusables.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <>
      <div aria-hidden="true" className={`cart-backdrop ${open ? "is-open" : ""}`} onClick={onClose} />
      <aside
        aria-hidden={!open}
        aria-labelledby="cart-title"
        aria-modal="true"
        className={`cart-drawer ${open ? "is-open" : ""}`}
        inert={!open}
        onKeyDown={handleKeyDown}
        ref={drawerRef}
        role="dialog"
      >
        <div className="cart-head">
          <div>
            <span className="eyebrow">Tu selección</span>
            <h2 id="cart-title">Carrito</h2>
            <p>{itemCount ? `${itemCount} ${itemCount === 1 ? "producto" : "productos"}` : "Todavía no agregaste productos"}</p>
          </div>
          <button aria-label="Cerrar carrito" className="icon-button" onClick={onClose} ref={closeButtonRef} type="button">×</button>
        </div>

        <div className={`cart-body ${lines.length ? "" : "is-empty"}`}>
          {lines.length === 0 ? (
            <div className="cart-empty">
              <span aria-hidden="true">♪</span>
              <h3>Tu carrito está vacío</h3>
              <p>Elegí un producto del catálogo y lo vas a encontrar acá.</p>
            </div>
          ) : lines.map((line) => (
            <article className="cart-line" key={line.key}>
              <img src={line.image} alt="" />
              <div className="cart-line-content">
                <div className="cart-line-top">
                  <div>
                    <h3>{line.name}</h3>
                    <p>{[line.colorLabel, line.size ? `Talle ${line.size}` : null].filter(Boolean).join(" · ") || "Producto"}</p>
                  </div>
                  <strong>{formatMoney(line.price * line.quantity)}</strong>
                </div>
                <div className="cart-line-actions">
                  <div className="quantity" role="group" aria-label={`Cantidad de ${line.name}`}>
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
              <div className="cart-total"><span>Subtotal</span><strong>{formatMoney(total)}</strong></div>
              {checkoutHref ? (
                <a className="checkout-button" href={checkoutHref}>Continuar al pago</a>
              ) : (
                <button className="checkout-button" disabled type="button">Checkout desactivado</button>
              )}
              <p className="cart-pending">{checkoutNote ?? "Vas a revisar el pedido antes de abrir Mercado Pago."}</p>
              <button className="text-button clear-cart" onClick={onClear} type="button">Vaciar carrito</button>
            </>
          ) : <button className="browse-button" onClick={onClose} type="button">Seguir viendo productos</button>}
        </div>
      </aside>
    </>
  );
}
