import { createClient } from "@supabase/supabase-js";
import { cauceProducts, type CauceProduct } from "@/lib/cauce/catalog";
import { cache } from "react";
import { cauceDatabaseEnabled, caucePublicConfig } from "@/lib/cauce/config";

export type CauceStock = { product_id: string; stock: number; version: number };

export function caucePublicClient() {
  const { url, key } = caucePublicConfig();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function mapCauceRows(products: Record<string, unknown>[], stock: CauceStock[]): CauceProduct[] {
  const byId = new Map(stock.map((row) => [row.product_id, row]));
  return products.map((row) => {
    const item = row as unknown as CauceProduct;
    const quantity = byId.get(item.id)?.stock ?? 0;
    return { ...item, price: Number(item.price), stock: quantity };
  });
}

export const getCauceProducts = cache(async (): Promise<CauceProduct[]> => {
  if (!cauceDatabaseEnabled()) return cauceProducts.filter((product) => product.active);
  const db = caucePublicClient();
  const [products, inventory] = await Promise.all([
    db.from("cauce_products").select("id,slug,category,name,price,description,image,material,dimensions,care,badge,featured,active").eq("active", true).order("name"),
    db.from("cauce_inventory").select("product_id,stock,version"),
  ]);
  if (products.error || inventory.error) throw new Error("El catálogo no está disponible temporalmente.");
  return mapCauceRows(products.data ?? [], inventory.data ?? []);
});

export async function getCauceProduct(slug: string) {
  return (await getCauceProducts()).find((item) => item.slug === slug);
}
