import Image from "next/image";
import Link from "next/link";
import { ProductTile } from "@/components/cauce/ProductTile";
import { getCauceProducts } from "@/lib/cauce/backend";

export default async function Home() {
  const featuredProducts = (await getCauceProducts()).filter((product) => product.featured && product.active).slice(0,4);
  return <main>
    <section className="c-hero" aria-labelledby="c-hero-heading">
      <Image className="c-hero-photo" src="/cauce/hero.webp" alt="Mesa de madera con cerámica artesanal, textiles y vidrio al sol" fill priority sizes="100vw" />
      <div className="c-hero-wash" aria-hidden="true" />
      <div className="c-container c-hero-content">
        <span className="c-kicker">Nueva colección · Casa 2026</span>
        <h1 id="c-hero-heading">Hacé espacio<br />para lo <em>simple.</em></h1>
        <p>Objetos con intención, texturas que se sienten y detalles que vuelven especial lo cotidiano.</p>
        <Link className="c-button c-button-dark" href="/cauce/catalogo">Descubrí la colección <span aria-hidden="true">↗</span></Link>
      </div>
      <div className="c-hero-index"><span>01 / 03</span><span>CASA &amp; OBJETOS</span></div>
    </section>

    <section className="c-promise-bar" aria-label="Nuestra propuesta"><div className="c-container">
      <span><i aria-hidden="true">✳</i> Objetos para todos los días</span><span><i aria-hidden="true">✳</i> Materiales que inspiran</span><span><i aria-hidden="true">✳</i> Diseño que perdura</span>
    </div></section>

    <section className="c-section c-intro" id="coleccion">
      <div className="c-container">
        <div className="c-section-header"><div><span className="c-overline">Curaduría Cauce</span><h2>Elegidos para quedarnos.</h2></div><Link className="c-text-link" href="/cauce/catalogo">Ver todos los productos <span aria-hidden="true">↗</span></Link></div>
        <div className="c-grid">{featuredProducts.map((product) => <ProductTile product={product} key={product.id} />)}</div>
      </div>
    </section>

    <section className="c-categories-section"><div className="c-container">
      <div className="c-section-header"><div><span className="c-overline">Encontrá tu inspiración</span><h2>Un lugar para cada ritual.</h2></div></div>
      <div className="c-category-grid">
        <Link className="c-category-card" href="/cauce/catalogo?categoria=Mesa"><Image src="/cauce/catalog-b-05.webp" alt="Cuenco de cerámica marfil" fill sizes="(max-width: 720px) 100vw, 33vw"/><div><span>01 · La mesa</span><h3>Para compartir.</h3><span className="c-category-arrow">↗</span></div></Link>
        <Link className="c-category-card" href="/cauce/catalogo?categoria=Textiles"><Image src="/cauce/catalog-a-04.webp" alt="Almohadón tejido en lino claro" fill sizes="(max-width: 720px) 100vw, 33vw"/><div><span>02 · Texturas</span><h3>Para sentir.</h3><span className="c-category-arrow">↗</span></div></Link>
        <Link className="c-category-card" href="/cauce/catalogo?categoria=Decoraci%C3%B3n"><Image src="/cauce/catalog-a-01.webp" alt="Jarrón de terracota escultórico" fill sizes="(max-width: 720px) 100vw, 33vw"/><div><span>03 · Detalles</span><h3>Para habitar.</h3><span className="c-category-arrow">↗</span></div></Link>
      </div>
    </div></section>

    <section className="c-manifesto" id="nosotros"><div className="c-container c-manifesto-layout">
      <div><span className="c-overline">Nuestra esencia</span><h2>Menos cosas.<br /><em>Más sentido.</em></h2></div>
      <div><p>Creemos en los objetos que acompañan historias. Los que elegís por cómo se sienten, cómo se usan y cómo transforman un espacio sin pedir protagonismo.</p><p>En Cauce reunimos una colección de piezas simples, cálidas y atemporales. Para que tu casa se parezca un poquito más a vos.</p><Link className="c-text-link" href="/cauce/catalogo">Explorar objetos <span aria-hidden="true">↗</span></Link></div>
    </div></section>

    <section className="c-end-cta"><div className="c-container"><span className="c-overline">Tu próximo favorito</span><h2>Un detalle puede cambiarlo todo.</h2><Link className="c-button c-button-light" href="/cauce/catalogo">Recorré la tienda ↗</Link></div></section>
  </main>;
}
