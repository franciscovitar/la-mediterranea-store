import { NextResponse } from "next/server";
import { AdminAuthorizationError, requireAdmin } from "@/lib/admin/auth";

export async function GET() {
  try {
    const supabase = await requireAdmin();
    const { data, error } = await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ orders: data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof AdminAuthorizationError ? 403 : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudieron leer los pedidos." }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
