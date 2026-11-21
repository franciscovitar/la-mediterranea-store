import { noStoreJson } from "@/lib/http/request";
import { cauceProducts } from "@/lib/cauce/catalog";

export async function GET() {
  return noStoreJson({ products: cauceProducts.filter((product) => product.active) });
}
