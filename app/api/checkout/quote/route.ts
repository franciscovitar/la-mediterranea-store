import { CheckoutValidationError, quoteCheckout } from "@/lib/commerce/checkout";
import { HttpRequestError, noStoreJson, readJsonBody } from "@/lib/http/request";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await readJsonBody<{ lines?: unknown }>(request);
    const quote = quoteCheckout(body.lines);
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
