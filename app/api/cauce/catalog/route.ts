import { noStoreJson } from "@/lib/http/request";
import { getCauceProducts } from "@/lib/cauce/backend";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return noStoreJson({ products: await getCauceProducts() });
  } catch {
    return noStoreJson({ error: "No se pudo leer el catálogo de Cauce." }, { status: 503 });
  }
}
