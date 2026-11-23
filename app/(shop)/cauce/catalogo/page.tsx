import type { Metadata } from "next";
import { CatalogExplorer } from "@/components/cauce/CatalogExplorer";
import { type CatalogSort } from "@/lib/cauce/catalog";
import { getCauceProducts } from "@/lib/cauce/backend";

export const metadata: Metadata = {
  title: "Tienda | Cauce",
  description: "Explorá objetos para la casa: mesa, decoración, textiles, iluminación y accesorios de la colección Cauce.",
};

export default async function CatalogPage({ searchParams }: {
  searchParams: Promise<{ categoria?: string; q?: string; orden?: string }>;
}) {
  const params = await searchParams;
  const products = await getCauceProducts();
  const cauceCategories = Array.from(new Set(products.map((product) => product.category)));
  const category = params.categoria && cauceCategories.includes(params.categoria) ? params.categoria : "Todos";
  const sort: CatalogSort = params.orden === "precio-asc" || params.orden === "precio-desc" || params.orden === "nombre" ? params.orden : "destacados";
  return <main className="c-page"><div className="c-container">
    <div className="c-breadcrumb"><a href="/cauce">Inicio</a><span>/</span><span>Tienda</span></div>
    <div className="c-page-heading"><span className="c-overline">Objetos para tu casa</span><h1>La colección.</h1><p>Una selección de piezas con materiales honestos y detalles que hacen la diferencia.</p></div>
    <CatalogExplorer products={products} key={`${category}|${params.q ?? ""}|${sort}`} initialCategory={category} initialQuery={params.q ?? ""} initialSort={sort} />
  </div></main>;
}
