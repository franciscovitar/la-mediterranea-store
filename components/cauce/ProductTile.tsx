"use client";

import Image from "next/image";
import Link from "next/link";
import { formatMoney } from "@/lib/products";
import type { CauceProduct } from "@/lib/cauce/catalog";
import { useCauceCart } from "./CauceCartProvider";

export function ProductTile({ product }: { product: CauceProduct }) {
  const { add, isSaved, toggleSaved } = useCauceCart();
  const saved = isSaved(product.id);

  return <article className="c-product-card">
    <div className="c-product-image">
      <Link href={`/producto/${product.slug}`} aria-label={`Ver ${product.name}`}>
        <Image src={product.image} alt={product.name} fill sizes="(max-width: 600px) 50vw, (max-width: 1000px) 33vw, 25vw" />
      </Link>
      {product.badge ? <span className="c-product-badge">{product.badge}</span> : null}
      <button className={`c-heart ${saved ? "is-saved" : ""}`} type="button" aria-pressed={saved} aria-label={`${saved ? "Quitar" : "Guardar"} ${product.name} ${saved ? "de" : "en"} favoritos`} onClick={() => toggleSaved(product.id)}>
        <svg viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.65" aria-hidden="true"><path d="M20.5 8c0 5.2-8.5 11-8.5 11S3.5 13.2 3.5 8a4.5 4.5 0 0 1 8.5-2.1A4.5 4.5 0 0 1 20.5 8Z" /></svg>
      </button>
      <button className="c-quick-add" onClick={() => add(product)} type="button">+ Agregar al carrito</button>
    </div>
    <div className="c-product-meta"><span>{product.category}</span><Link href={`/producto/${product.slug}`}>{product.name}</Link><strong>{formatMoney(product.price)}</strong></div>
  </article>;
}
