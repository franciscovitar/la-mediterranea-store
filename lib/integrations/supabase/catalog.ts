import type { SupabaseClient } from "@supabase/supabase-js";
import type { Product, ProductColor } from "@/lib/products";
import type { Database } from "@/lib/supabase/database.types";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type ColorRow = Database["public"]["Tables"]["product_colors"]["Row"];
type SizeRow = Database["public"]["Tables"]["product_sizes"]["Row"];

export function catalogFromRows(rows: {
  products: ProductRow[];
  colors: ColorRow[];
  sizes: SizeRow[];
}): Product[] {
  const colors = new Map<string, ProductColor[]>();
  for (const color of rows.colors) {
    const items = colors.get(color.product_id) ?? [];
    items.push({ key: color.key, label: color.label, swatch: color.swatch, image: color.image });
    colors.set(color.product_id, items);
  }
  const sizes = new Map<string, string[]>();
  for (const size of rows.sizes) {
    const items = sizes.get(size.product_id) ?? [];
    items.push(size.size);
    sizes.set(size.product_id, items);
  }
  return rows.products.map((product) => ({
    id: product.id,
    category: product.category,
    name: product.name,
    price: Number(product.price),
    description: product.description,
    image: product.image,
    note: product.note ?? undefined,
    colors: colors.get(product.id),
    sizes: sizes.get(product.id),
    active: product.active,
  }));
}

export async function readCatalog(client: SupabaseClient<Database>, activeOnly = false): Promise<Product[]> {
  let productsQuery = client.from("products").select("*").order("category").order("name");
  if (activeOnly) productsQuery = productsQuery.eq("active", true);
  const [productsResult, colorsResult, sizesResult] = await Promise.all([
    productsQuery,
    client.from("product_colors").select("*").order("sort_order"),
    client.from("product_sizes").select("*").order("sort_order"),
  ]);
  if (productsResult.error || colorsResult.error || sizesResult.error) {
    throw new Error(productsResult.error?.message ?? colorsResult.error?.message ?? sizesResult.error?.message ?? "No se pudo leer el catálogo.");
  }
  return catalogFromRows({ products: productsResult.data, colors: colorsResult.data, sizes: sizesResult.data });
}
