import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";

function safeNext(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/admin";
}

/**
 * Supabase's current SSR flow can return either a PKCE `code` or a template
 * `token_hash`. Exchange/verify it here so the session is written as SSR cookies.
 */
export async function GET(request: NextRequest) {
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const destination = new URL(next, request.url);
  const response = NextResponse.redirect(destination);

  try {
    const supabase = createRouteClient(request, response);
    const code = request.nextUrl.searchParams.get("code");
    const tokenHash = request.nextUrl.searchParams.get("token_hash");
    const type = request.nextUrl.searchParams.get("type");
    const supportedOtpTypes = new Set(["email", "magiclink", "signup"]);

    const result = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : tokenHash && type && supportedOtpTypes.has(type)
        ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType })
        : { error: new Error("El enlace de acceso no es válido o ya venció.") };

    if (result.error) {
      console.error("Supabase auth confirmation failed", result.error.message);
      const login = new URL("/admin/login", request.url);
      login.searchParams.set("error", "El enlace de acceso no es válido o ya venció. Pedí uno nuevo.");
      return NextResponse.redirect(login);
    }

    return response;
  } catch {
    const login = new URL("/admin/login", request.url);
    login.searchParams.set("error", "No se pudo confirmar el acceso. Pedí un enlace nuevo.");
    return NextResponse.redirect(login);
  }
}
