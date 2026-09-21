import { NextResponse } from "next/server";
import { validateDraftProducts } from "@/lib/admin/draft";
import { AdminAuthorizationError, requireAdmin } from "@/lib/admin/auth";
import { readCatalog } from "@/lib/integrations/supabase/catalog";
import { HttpRequestError, readJsonBody } from "@/lib/http/request";

function errorResponse(error: unknown) {
  if (error instanceof AdminAuthorizationError) return NextResponse.json({ error: error.message }, { status: 403, headers: { "Cache-Control": "no-store" } });
  if (error instanceof HttpRequestError) return NextResponse.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo guardar el producto." }, { status: 400, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  try {
    return NextResponse.json({ products: await readCatalog(await requireAdmin()) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonBody<{ product?: unknown }>(request);
    const [product] = validateDraftProducts([body.product]);
    if (!product) throw new Error("Producto inválido.");
    const supabase = await requireAdmin();
    const { error: productError } = await supabase.from("products").upsert({
      id: product.id,
      category: product.category,
      name: product.name,
      price: product.price,
      description: product.description,
      image: product.image,
      note: product.note ?? null,
      active: product.active,
    });
    if (productError) throw productError;
    const [{ error: colorsDeleteError }, { error: sizesDeleteError }] = await Promise.all([
      supabase.from("product_colors").delete().eq("product_id", product.id),
      supabase.from("product_sizes").delete().eq("product_id", product.id),
    ]);
    if (colorsDeleteError || sizesDeleteError) throw colorsDeleteError ?? sizesDeleteError;
    if (product.colors?.length) {
      const { error } = await supabase.from("product_colors").insert(product.colors.map((color, index) => ({
        product_id: product.id, key: color.key, label: color.label, swatch: color.swatch, image: color.image, sort_order: index + 1,
      })));
      if (error) throw error;
    }
    if (product.sizes?.length) {
      const { error } = await supabase.from("product_sizes").insert(product.sizes.map((size, index) => ({ product_id: product.id, size, sort_order: index + 1 })));
      if (error) throw error;
    }
    return NextResponse.json({ product }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await readJsonBody<{ productId?: unknown; active?: unknown }>(request);
    if (typeof body.productId !== "string" || typeof body.active !== "boolean") throw new Error("Cambio de estado inválido.");
    const { error } = await (await requireAdmin()).from("products").update({ active: body.active }).eq("id", body.productId);
    if (error) throw error;
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
