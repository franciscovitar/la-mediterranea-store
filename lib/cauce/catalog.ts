import data from "@/data/cauce-products.json";
import type { Product } from "@/lib/products";

export type CauceProduct = Product & {
  slug: string;
  material: string;
  dimensions: string;
  care: string;
  badge?: string;
  featured?: boolean;
};

export type CatalogSort = "destacados" | "precio-asc" | "precio-desc" | "nombre";

export const cauceProducts = data as CauceProduct[];
export const cauceCategories = Array.from(new Set(cauceProducts.map((product) => product.category)));
export const featuredProducts = cauceProducts.filter((product) => product.featured && product.active);

export function findCauceProduct(slug: string) {
  return cauceProducts.find((product) => product.slug === slug && product.active);
}

export function filterCauceProducts(options: { query?: string; category?: string; sort?: CatalogSort }) {
  const normalizedQuery = (options.query ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const products = cauceProducts.filter((product) => {
    if (!product.active) return false;
    if (options.category && options.category !== "Todos" && product.category !== options.category) return false;
    const searchable = `${product.name} ${product.description} ${product.category} ${product.material}`
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return !normalizedQuery || searchable.includes(normalizedQuery);
  });

  if (options.sort === "precio-asc") return products.sort((a, b) => a.price - b.price);
  if (options.sort === "precio-desc") return products.sort((a, b) => b.price - a.price);
  if (options.sort === "nombre") return products.sort((a, b) => a.name.localeCompare(b.name, "es"));
  return products;
}
