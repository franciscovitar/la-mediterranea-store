import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function middleware(request: NextRequest) {
  // Public Cauce traffic must not reach the historical merchant operations.
  const path = request.nextUrl.pathname;
  const legacy = path.startsWith("/api/checkout/") || path.startsWith("/api/admin/") ||
    path.startsWith("/api/webhooks/mercadopago") || path.startsWith("/api/integrations/") ||
    path === "/admin" || path.startsWith("/admin/") || path.startsWith("/checkout/") ||
    path.startsWith("/auth/");
  const privateLegacyDev = process.env.NODE_ENV === "development" && process.env.CAUCE_LEGACY_DEV_ACCESS === "true";
  if (legacy && !privateLegacyDev) {
    if (path.startsWith("/api/")) return NextResponse.json({ error: "Operación no disponible." }, { status: 503 });
    return NextResponse.rewrite(new URL("/no-disponible", request.url));
  }
  if (!legacy) return NextResponse.next();
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
