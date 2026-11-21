"use client";

import Link from "next/link";
import { cauceProducts } from "@/lib/cauce/catalog";
import { useCauceCart } from "./CauceCartProvider";
import { ProductTile } from "./ProductTile";

export function SavedProducts() {
  const { saved } = useCauceCart();
  const products = cauceProducts.filter((product) => saved.includes(product.id));
  return products.length ? <div className="c-grid">{products.map((product) => <ProductTile product={product} key={product.id} />)}</div> :
    <div className="c-no-results"><span aria-hidden="true">♡</span><h2>Tu lista está esperando</h2><p>Guardá las piezas que te gustan para encontrarlas fácilmente después.</p><Link className="c-button c-button-dark" href="/catalogo">Explorar la tienda</Link></div>;
}
