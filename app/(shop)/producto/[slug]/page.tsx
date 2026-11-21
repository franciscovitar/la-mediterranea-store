import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProductPurchase } from "@/components/cauce/ProductPurchase";
import { ProductTile } from "@/components/cauce/ProductTile";
import { cauceProducts, findCauceProduct } from "@/lib/cauce/catalog";
import { formatMoney } from "@/lib/products";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() { return cauceProducts.map((product) => ({ slug: product.slug })); }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = findCauceProduct(slug);
  if (!product) return { title: "Producto no encontrado | Cauce" };
  return { title: `${product.name} | Cauce`, description: product.description, openGraph: { images: [product.image] } };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = findCauceProduct(slug);
  if (!product) notFound();
  const related = cauceProducts.filter((item) => item.id !== product.id && item.category === product.category).slice(0, 4);
  const fallbackRelated = related.length >= 2 ? related : cauceProducts.filter((item) => item.id !== product.id).slice(0, 4);

  return <main className="c-page c-product-page"><div className="c-container">
    <div className="c-breadcrumb"><Link href="/">Inicio</Link><span>/</span><Link href="/catalogo">Tienda</Link><span>/</span><span>{product.name}</span></div>
    <div className="c-pdp-grid">
      <div className="c-pdp-photo"><Image priority src={product.image} alt={product.name} fill sizes="(max-width: 800px) 100vw, 55vw" /></div>
      <div className="c-pdp-info"><span className="c-overline">Cauce · {product.category}</span><h1>{product.name}</h1><strong className="c-pdp-price">{formatMoney(product.price)}</strong>
        <p className="c-pdp-description">{product.description}</p>
        <ProductPurchase product={product} />
        <div className="c-pdp-details"><h2>Detalles de la pieza</h2>
          <dl><div><dt>Material</dt><dd>{product.material}</dd></div><div><dt>Medidas</dt><dd>{product.dimensions}</dd></div><div><dt>Cuidados</dt><dd>{product.care}</dd></div></dl>
        </div>
        <div className="c-pdp-note"><span aria-hidden="true">✳</span><p>Una pieza elegida para acompañar tus espacios y tus rutinas.</p></div>
      </div>
    </div>
    <section className="c-related"><div className="c-section-header"><div><span className="c-overline">Para seguir descubriendo</span><h2>También te puede gustar.</h2></div><Link className="c-text-link" href="/catalogo">Ver la colección ↗</Link></div>
      <div className="c-grid">{fallbackRelated.map((item) => <ProductTile key={item.id} product={item} />)}</div>
    </section>
  </div></main>;
}
