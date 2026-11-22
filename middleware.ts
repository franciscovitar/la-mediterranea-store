import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { cauceRefreshSession } from "@/lib/cauce/auth-middleware";
import { cauceDatabaseEnabled, cauceMerchantEnabled } from "@/lib/cauce/config";
import { cauceProducts } from "@/lib/cauce/catalog";
import { isLegacyUnavailablePath } from "@/lib/cauce/route-policy";

export async function middleware(request: NextRequest) {
  // Public Cauce traffic must not reach the historical merchant operations.
  const path = request.nextUrl.pathname;
  if ((path === "/gestion" || path.startsWith("/gestion/")) && !cauceMerchantEnabled()) {
    return NextResponse.rewrite(new URL("/__cauce_not_found", request.url));
  }
  // Static catalog can reliably reject nonexistent slugs before App Router streaming.
  // Database mode resolves dynamic slugs through the server query instead.
  if (path.startsWith("/producto/") && !cauceDatabaseEnabled() &&
    !cauceProducts.some((product) => product.active && path === `/producto/${product.slug}`)) {
    return NextResponse.rewrite(new URL("/__cauce_not_found", request.url));
  }
  const legacy = isLegacyUnavailablePath(path);
  const privateLegacyDev = process.env.NODE_ENV === "development" && process.env.CAUCE_LEGACY_DEV_ACCESS === "true";
  if (legacy && !privateLegacyDev) {
    if (path.startsWith("/api/")) return NextResponse.json({ error: "Operación no disponible." }, { status: 503 });
    return NextResponse.rewrite(new URL("/no-disponible", request.url));
  }
  if (path === "/gestion" || path.startsWith("/gestion/") ||
      path.startsWith("/api/cauce/merchant") || path.startsWith("/auth/cauce/")) {
    return cauceRefreshSession(request);
  }
  if (!legacy) return NextResponse.next();
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
