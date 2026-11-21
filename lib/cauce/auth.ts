import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cauceMerchantEnabled, caucePublicConfig } from "@/lib/cauce/config";

export class CauceAccessError extends Error {
  constructor(message = "No tenés acceso a la gestión de Cauce.", public status = 403) { super(message); }
}

export async function cauceServerAuth() {
  const { url, key } = caucePublicConfig();
  const store = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (changes) => {
        try { changes.forEach(({ name, value, options }) => store.set(name, value, options)); }
        catch { /* Server Components cannot set refreshed cookies; middleware owns refresh. */ }
      },
    },
  });
}

export async function requireCauceStaff() {
  if (!cauceMerchantEnabled()) throw new CauceAccessError("Gestión todavía no habilitada.", 503);
  const client = await cauceServerAuth();
  const { data, error } = await client.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || typeof userId !== "string") throw new CauceAccessError();
  const member = await client.from("cauce_staff").select("user_id").eq("user_id", userId).maybeSingle();
  if (member.error || !member.data) throw new CauceAccessError();
  return client;
}
