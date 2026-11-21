import { NextResponse } from "next/server";
import { cauceMerchantEnabled } from "@/lib/cauce/config";
import { cauceServerAuth } from "@/lib/cauce/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!cauceMerchantEnabled()) return NextResponse.redirect(new URL("/", url));
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/gestion?error=login", url));
  const client = await cauceServerAuth();
  const { error } = await client.auth.exchangeCodeForSession(code);
  return NextResponse.redirect(new URL(error ? "/gestion?error=login" : "/gestion", url));
}
