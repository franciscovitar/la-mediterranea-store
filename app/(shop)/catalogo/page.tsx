import type { Metadata } from "next";
import { CatalogExplorer } from "@/components/cauce/CatalogExplorer";
import { cauceCategories, type CatalogSort } from "@/lib/cauce/catalog";

export const metadata: Metadata = {
  title: "Tienda | Cauce",
  description: "Explorá objetos para la casa: mesa, decoración, textiles, iluminación y accesorios de la colección Cauce.",
};

export default async function CatalogPage({ searchParams }: {
  searchParams: Promise<{ categoria?: string; q?: string; orden?: string }>;
}) {
  const params = await searchParams;
  const category = params.categoria && cauceCategories.includes(params.categoria) ? params.categoria : "Todos";
  const sort: CatalogSort = params.orden === "precio-asc" || params.orden === "precio-desc" || params.orden === "nombre" ? params.orden : "destacados";
  return <main className="c-page"><div className="c-container">
    <div className="c-breadcrumb"><a href="/">Inicio</a><span>/</span><span>Tienda</span></div>
    <div className="c-page-heading"><span className="c-overline">Objetos para tu casa</span><h1>La colección.</h1><p>Una selección de piezas con materiales honestos y detalles que hacen la diferencia.</p></div>
    <CatalogExplorer key={`${category}|${params.q ?? ""}|${sort}`} initialCategory={category} initialQuery={params.q ?? ""} initialSort={sort} />
  </div></main>;
}
