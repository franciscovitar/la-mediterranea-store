import { createClient } from "@/lib/supabase/server";

export class AdminAuthorizationError extends Error {
  constructor() {
    super("No tenés permisos de administración.");
    this.name = "AdminAuthorizationError";
  }
}

export async function requireAdmin() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : undefined;
  if (error || !userId) throw new AdminAuthorizationError();

  const membership = await supabase.from("admin_users").select("user_id").eq("user_id", userId).maybeSingle();
  if (membership.error || !membership.data) throw new AdminAuthorizationError();
  return supabase;
}
