import { noStoreJson } from "@/lib/http/request";
import { getPublicCatalog } from "@/lib/integrations/supabase/public";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return noStoreJson({ products: await getPublicCatalog() });
  } catch (error) {
    console.error("Supabase catalog read failed", error);
    return noStoreJson({ error: "No se pudo leer el catálogo." }, { status: 503 });
  }
}
