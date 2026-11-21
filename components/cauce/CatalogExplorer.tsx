"use client";

import { useEffect, useMemo, useState } from "react";
import { cauceCategories, filterCauceProducts, type CatalogSort } from "@/lib/cauce/catalog";
import { ProductTile } from "./ProductTile";

const sortLabels: Record<CatalogSort, string> = {
  destacados: "Destacados",
  "precio-asc": "Precio: menor a mayor",
  "precio-desc": "Precio: mayor a menor",
  nombre: "Nombre: A–Z",
};

export function CatalogExplorer({ initialCategory = "Todos", initialQuery = "", initialSort = "destacados" }: {
  initialCategory?: string;
  initialQuery?: string;
  initialSort?: CatalogSort;
}) {
  const [category, setCategory] = useState(cauceCategories.includes(initialCategory) ? initialCategory : "Todos");
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<CatalogSort>(initialSort);
  const products = useMemo(() => filterCauceProducts({ query, category, sort }), [query, category, sort]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (category !== "Todos") params.set("categoria", category);
    if (query.trim()) params.set("q", query.trim());
    if (sort !== "destacados") params.set("orden", sort);
    const search = params.toString();
    const target = `/catalogo${search ? `?${search}` : ""}`;
    if (window.location.pathname + window.location.search !== target) window.history.replaceState(null, "", target);
  }, [category, query, sort]);

  return <div className="c-catalog-layout">
    <aside className="c-filters" aria-label="Filtros de productos">
      <div className="c-filter-heading"><h2>Filtrar por</h2><button type="button" onClick={() => { setCategory("Todos"); setQuery(""); setSort("destacados"); }}>Limpiar</button></div>
      <fieldset><legend>Categorías</legend>
        {["Todos", ...cauceCategories].map((item) => <label className="c-filter-radio" key={item}>
          <input checked={category === item} onChange={() => setCategory(item)} type="radio" name="categoria" />
          <span>{item === "Todos" ? "Todos los productos" : item}</span>
        </label>)}
      </fieldset>
    </aside>
    <div className="c-results">
      <div className="c-search-controls">
        <label className="c-search-field"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m14.6 14.6 5.4 5.4"/></svg><span className="c-sr-only">Buscar productos</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="¿Qué estás buscando?" />
        </label>
        <label className="c-sort"><span>Ordenar por</span><select value={sort} onChange={(event) => setSort(event.target.value as CatalogSort)}>
          {(Object.keys(sortLabels) as CatalogSort[]).map((key) => <option key={key} value={key}>{sortLabels[key]}</option>)}
        </select></label>
      </div>
      <div className="c-results-count" aria-live="polite">{products.length} {products.length === 1 ? "producto" : "productos"}{category !== "Todos" ? ` en ${category}` : ""}</div>
      {products.length ? <div className="c-grid c-results-grid">{products.map((product) => <ProductTile key={product.id} product={product} />)}</div> :
        <div className="c-no-results"><span aria-hidden="true">✳</span><h3>No encontramos productos</h3><p>Probá con otra búsqueda o elegí una categoría diferente.</p><button type="button" onClick={() => { setQuery(""); setCategory("Todos"); }}>Ver todos los productos</button></div>}
    </div>
  </div>;
}
