import { noStoreJson } from "@/lib/http/request";
import { getCauceProducts } from "@/lib/cauce/backend";

export async function GET() {
  return noStoreJson({ products: await getCauceProducts() });
}
