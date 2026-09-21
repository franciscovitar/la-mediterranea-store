import { CheckoutValidationError, quoteCheckoutFromCatalog } from "@/lib/commerce/checkout";
import { HttpRequestError, noStoreJson, readJsonBody } from "@/lib/http/request";
import { getPublicCatalog } from "@/lib/integrations/supabase/public";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await readJsonBody<{ lines?: unknown }>(request);
    const quote = quoteCheckoutFromCatalog(body.lines, await getPublicCatalog());
    return noStoreJson(quote);
  } catch (error) {
    if (error instanceof HttpRequestError) {
      return noStoreJson({ error: error.message }, { status: error.status });
    }
    if (error instanceof CheckoutValidationError) {
      return noStoreJson({ error: error.message }, { status: 400 });
    }
    return noStoreJson({ error: "No se pudo calcular el pedido." }, { status: 500 });
  }
}
