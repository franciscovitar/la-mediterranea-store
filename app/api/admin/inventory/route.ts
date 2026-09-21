import { NextResponse } from "next/server";
import { AdminAuthorizationError, requireAdmin } from "@/lib/admin/auth";
import { HttpRequestError, readJsonBody } from "@/lib/http/request";

function responseError(error: unknown) {
  const status = error instanceof AdminAuthorizationError ? 403 : error instanceof HttpRequestError ? error.status : 400;
  return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo actualizar el stock." }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  try {
    const { data, error } = await (await requireAdmin()).from("inventory").select("*");
    if (error) throw error;
    return NextResponse.json({ inventory: data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return responseError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await readJsonBody<{ productId?: unknown; colorKey?: unknown; size?: unknown; tracked?: unknown; stock?: unknown }>(request);
    if (typeof body.productId !== "string" || typeof body.colorKey !== "string" || typeof body.size !== "string" || typeof body.tracked !== "boolean") throw new Error("Variante de stock inválida.");
    const stock = Number(body.stock);
    if (!Number.isInteger(stock) || stock < 0) throw new Error("La cantidad de stock no es válida.");
    const supabase = await requireAdmin();
    const query = supabase.from("inventory");
    const { error } = body.tracked
      ? await query.upsert({ product_id: body.productId, color_key: body.colorKey, size: body.size, stock })
      : await query.delete().eq("product_id", body.productId).eq("color_key", body.colorKey).eq("size", body.size);
    if (error) throw error;
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return responseError(error);
  }
}
