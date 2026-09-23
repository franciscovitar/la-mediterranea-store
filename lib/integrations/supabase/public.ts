import { createClient } from "@/lib/supabase/server";
import { products as bootstrapProducts, type Product } from "@/lib/products";
import { readCatalog } from "@/lib/integrations/supabase/catalog";

export async function getPublicCatalog(): Promise<Product[]> {
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  if (!configured) {
    const safeFixtureContext = process.env.NODE_ENV !== "production" || process.env.VERCEL_ENV === "preview";
    if (safeFixtureContext) {
      return bootstrapProducts;
    }
    throw new Error("El catálogo productivo no tiene Supabase configurado.");
  }
  return readCatalog(await createClient(), true);
}
