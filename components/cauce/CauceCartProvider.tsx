"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { CartDrawer } from "@/components/CartDrawer";
import { type CartLine } from "@/lib/commerce/cart";
import { reconcileCauceCart } from "@/lib/cauce/cart";
import { type CauceProduct } from "@/lib/cauce/catalog";

const CART_KEY = "cauce-cart-v1";
const SAVED_KEY = "cauce-saved-v1";

type CartContextValue = {
  count: number;
  savedCount: number;
  saved: string[];
  products: CauceProduct[];
  add: (product: CauceProduct, quantity?: number) => void;
  open: () => void;
  isSaved: (id: string) => boolean;
  toggleSaved: (id: string) => void;
};

const Context = createContext<CartContextValue | null>(null);

export function useCauceCart() {
  const context = useContext(Context);
  if (!context) throw new Error("CauceCartProvider is missing");
  return context;
}

export function CauceCartProvider({ children, products }: { children: React.ReactNode; products: CauceProduct[] }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState("");

  useEffect(() => {
    try {
      const storedCart = localStorage.getItem(CART_KEY);
      if (storedCart) setCart(reconcileCauceCart(JSON.parse(storedCart), products));
    } catch { localStorage.removeItem(CART_KEY); }
    try {
      const raw = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]");
      if (Array.isArray(raw)) setSaved(raw.filter((id): id is string =>
        typeof id === "string" && products.some((product) => product.id === id)));
    } catch { localStorage.removeItem(SAVED_KEY); }
    setReady(true);
  }, [products]);

  useEffect(() => { if (ready) localStorage.setItem(CART_KEY, JSON.stringify(cart)); }, [cart, ready]);
  useEffect(() => { if (ready) localStorage.setItem(SAVED_KEY, JSON.stringify(saved)); }, [saved, ready]);
  useEffect(() => {
    document.body.classList.toggle("cart-is-open", open);
    return () => document.body.classList.remove("cart-is-open");
  }, [open]);
  useEffect(() => {
    if (!added) return;
    const timer = window.setTimeout(() => setAdded(""), 2600);
    return () => window.clearTimeout(timer);
  }, [added]);

  function add(product: CauceProduct, quantity = 1) {
    const max = product.stock === undefined ? 99 : Math.min(99, product.stock);
    if (max <= 0) return;
    const amount = Math.max(1, Math.min(max, Math.floor(quantity)));
    const key = `${product.id}||`;
    setCart((current) => {
      const found = current.find((line) => line.key === key);
      if (found) return current.map((line) => line.key === key ?
        { ...line, quantity: Math.min(max, line.quantity + amount) } : line);
      return [...current, { key, productId: product.id, name: product.name, image: product.image,
        price: product.price, quantity: amount }];
    });
    setAdded(product.name);
  }

  function toggleSaved(id: string) {
    setSaved((current) => current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]);
  }

  const value = useMemo<CartContextValue>(() => ({
    count: cart.reduce((sum, line) => sum + line.quantity, 0),
    savedCount: saved.length,
    saved,
    products,
    add,
    open: () => setOpen(true),
    isSaved: (id) => saved.includes(id),
    toggleSaved,
  // Actions operate on current functional state, so they don't depend on cart values.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [cart, saved, products]);

  return (
    <Context.Provider value={value}>
      <div className="c-site">{children}</div>
      <div className="c-site">
        <CartDrawer
          lines={cart}
          open={open}
          onClose={() => setOpen(false)}
          onStep={(key, delta) => setCart((current) => current
            .map((line) => { const product = products.find((item) => item.id === line.productId);
              const max = product?.stock === undefined ? 99 : Math.min(99, product.stock);
              return line.key === key ? { ...line, quantity: Math.min(max, line.quantity + delta) } : line; })
            .filter((line) => line.quantity > 0))}
          onRemove={(key) => setCart((current) => current.filter((line) => line.key !== key))}
          onClear={() => setCart([])}
          checkoutHref={null}
          checkoutNote="Estamos preparando la apertura de pedidos. Tu selección queda guardada en este navegador."
          disabledCheckoutLabel="Pedidos próximamente"
          emptyIcon="◌"
        />
      </div>
      {added ? <div className="c-toast" role="status"><span>✓</span> {added} se agregó al carrito.
        <button onClick={() => { setAdded(""); setOpen(true); }} type="button">Ver carrito</button>
      </div> : null}
    </Context.Provider>
  );
}
