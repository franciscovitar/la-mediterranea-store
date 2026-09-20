import { CheckoutValidationError, quoteCheckout } from "@/lib/commerce/checkout";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { lines?: unknown };
    const quote = quoteCheckout(body.lines);
    return Response.json(quote);
  } catch (error) {
    if (error instanceof CheckoutValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return Response.json({ error: "No se pudo calcular el pedido." }, { status: 500 });
  }
}
