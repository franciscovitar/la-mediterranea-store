import { getIntegrationReadiness } from "@/lib/integrations/config";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(getIntegrationReadiness(), {
    headers: { "Cache-Control": "no-store" },
  });
}
