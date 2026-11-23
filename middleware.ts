import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { cauceRefreshSession } from "@/lib/cauce/auth-middleware";
import { cauceDatabaseEnabled, cauceMerchantEnabled, cauceStandaloneSiteEnabled } from "@/lib/cauce/config";
import { cauceProducts } from "@/lib/cauce/catalog";
import { isLegacyUnavailablePath } from "@/lib/cauce/route-policy";

const cauceNamespace = (path: string) => path === "/cauce" || path.startsWith("/cauce/") ||
  path === "/api/cauce" || path.startsWith("/api/cauce/") ||
  path === "/auth/cauce/confirm" || path === "/gestion" || path.startsWith("/gestion/");

function standaloneAlias(path: string) {
  if (path === "/") return "/cauce";
  if (path === "/api/catalog") return "/api/cauce/catalog";
  if (path === "/catalogo" || path.startsWith("/catalogo/") ||
      path === "/favoritos" || path.startsWith("/favoritos/") ||
      path === "/pedido" || path.startsWith("/pedido/") ||
      path === "/producto" || path.startsWith("/producto/")) return `/cauce${path}`;
  return null;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // The original La Mediterránea app is the default on main/Production.
  // Cauce routes and its service-only APIs are unavailable without an explicit,
  // independent Preview environment opt-in.
  if (!cauceStandaloneSiteEnabled()) {
    if (cauceNamespace(path)) return NextResponse.rewrite(new URL("/__cauce_not_found", request.url));
    return updateSession(request);
  }

  // In the isolated Cauce staging site, historical commerce never runs.
  if (isLegacyUnavailablePath(path)) {
    if (path.startsWith("/api/")) return NextResponse.json({ error: "Operación no disponible." }, { status: 503 });
    return NextResponse.rewrite(new URL("/no-disponible", request.url));
  }
  if ((path === "/gestion" || path.startsWith("/gestion/")) && !cauceMerchantEnabled()) {
    return NextResponse.rewrite(new URL("/__cauce_not_found", request.url));
  }
  const productPath = path.startsWith("/cauce/producto/") ? path.slice("/cauce".length) : path;
  if (productPath.startsWith("/producto/") && !cauceDatabaseEnabled() &&
      !cauceProducts.some((product) => product.active && productPath === `/producto/${product.slug}`)) {
    return NextResponse.rewrite(new URL("/__cauce_not_found", request.url));
  }
  if (path === "/gestion" || path.startsWith("/gestion/") ||
      path.startsWith("/api/cauce/merchant") || path === "/auth/cauce/confirm") {
    return cauceRefreshSession(request);
  }

  const alias = standaloneAlias(path);
  if (alias) return NextResponse.rewrite(new URL(alias + request.nextUrl.search, request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
