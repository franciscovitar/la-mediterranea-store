import { getCauceProducts } from "@/lib/cauce/backend";
import { cauceSandboxCheckoutEnabled } from "@/lib/cauce/config";
import { parseCheckoutLines, quoteCheckout } from "@/lib/cauce/checkout";
import { checkoutHttpError, checkoutJson } from "@/lib/cauce/checkout-http";
import { checkSameOrigin } from "@/lib/cauce/validation";
import { readJsonBody } from "@/lib/http/request";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    checkSameOrigin(request);
    const body = await readJsonBody<{ lines?: unknown }>(request, 4096);
    const lines = parseCheckoutLines(body?.lines);
    const quote = quoteCheckout(lines, await getCauceProducts());
    return checkoutJson({ ...quote, sandboxEnabled: cauceSandboxCheckoutEnabled() });
  } catch (error) { return checkoutHttpError(error); }
}
