import { createClient } from "@/lib/supabase/server";
import { products as bootstrapProducts, type Product } from "@/lib/products";
import { readCatalog } from "@/lib/integrations/supabase/catalog";

export async function getPublicCatalog(): Promise<Product[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    // The fixture is deliberately limited to local development before configuration.
    return bootstrapProducts;
  }
  return readCatalog(await createClient(), true);
}
