import { cauceSandboxCheckoutEnabledForRequest, cauceStandaloneSiteEnabled } from "@/lib/cauce/config";

export const dynamic = "force-dynamic";

/** Read-only readiness signal: no tokens, webhook bypass details or provider IDs. */
export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!cauceStandaloneSiteEnabled()) {
    return Response.json({ error: "Not found" }, { status: 404, headers });
  }
  return Response.json({
    provider: "mercadopago",
    mode: "test-only",
    configured: cauceSandboxCheckoutEnabledForRequest(request),
  }, { headers });
}
