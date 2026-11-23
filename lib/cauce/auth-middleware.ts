import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { cauceMerchantEnabled, caucePublicConfig } from "@/lib/cauce/config";

export async function cauceRefreshSession(request: NextRequest) {
  if (!cauceMerchantEnabled()) return NextResponse.next({ request });
  const { url, key } = caucePublicConfig();
  let response = NextResponse.next({ request });
  const auth = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (changes, headers) => {
        changes.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        changes.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });
  await auth.auth.getClaims();
  return response;
}
