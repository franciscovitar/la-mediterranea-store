import { NextResponse } from "next/server";
import { AdminAuthorizationError, requireAdmin } from "@/lib/admin/auth";
import { validateDraftProducts } from "@/lib/admin/draft";
import { parseAdminBackup } from "@/lib/admin/export";
import { HttpRequestError, readJsonBody } from "@/lib/http/request";

function errorResponse(error: unknown) {
  const status = error instanceof AdminAuthorizationError ? 403 : error instanceof HttpRequestError ? error.status : 400;
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "No se pudo restaurar el respaldo." },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  try {
    const body = await readJsonBody<{ backup?: unknown }>(request, 2_000_000);
    const backup = parseAdminBackup(body.backup);
    const products = validateDraftProducts(backup.products);
    if (!products.length) throw new Error("El respaldo debe contener al menos un producto.");

    const supabase = await requireAdmin();
    const { data: currentProducts, error: currentError } = await supabase.from("products").select("id");
    if (currentError) throw currentError;

    const restoredIds = products.map((product) => product.id);
    const currentIds = (currentProducts ?? []).map((product) => product.id);
    const missingIds = currentIds.filter((id) => !restoredIds.includes(id));

    const { error: productsError } = await supabase.from("products").upsert(products.map((product) => ({
      id: product.id,
      category: product.category,
      name: product.name,
      price: product.price,
      description: product.description,
      image: product.image,
      note: product.note ?? null,
      active: product.active,
    })));
    if (productsError) throw productsError;

    const [{ error: colorsDeleteError }, { error: sizesDeleteError }, { error: inventoryDeleteError }] = await Promise.all([
      supabase.from("product_colors").delete().in("product_id", restoredIds),
      supabase.from("product_sizes").delete().in("product_id", restoredIds),
      currentIds.length ? supabase.from("inventory").delete().in("product_id", currentIds) : Promise.resolve({ error: null }),
    ]);
    if (colorsDeleteError || sizesDeleteError || inventoryDeleteError) throw colorsDeleteError ?? sizesDeleteError ?? inventoryDeleteError;

    const colors = products.flatMap((product) => (product.colors ?? []).map((color, index) => ({
      product_id: product.id,
      key: color.key,
      label: color.label,
      swatch: color.swatch,
      image: color.image,
      sort_order: index + 1,
    })));
    if (colors.length) {
      const { error } = await supabase.from("product_colors").insert(colors);
      if (error) throw error;
    }

    const sizes = products.flatMap((product) => (product.sizes ?? []).map((size, index) => ({
      product_id: product.id,
      size,
      sort_order: index + 1,
    })));
    if (sizes.length) {
      const { error } = await supabase.from("product_sizes").insert(sizes);
      if (error) throw error;
    }

    const inventory = Object.entries(backup.inventory)
      .filter(([, entry]) => entry.tracked)
      .map(([key, entry]) => {
        const [productId, colorKey = "", size = ""] = key.split("|");
        return { product_id: productId, color_key: colorKey, size, stock: entry.stock };
      });
    if (inventory.length) {
      const { error } = await supabase.from("inventory").insert(inventory);
      if (error) throw error;
    }

    // Never hard-delete products with possible historical order references. A full restore hides rows absent from the backup.
    if (missingIds.length) {
      const { error } = await supabase.from("products").update({ active: false }).in("id", missingIds);
      if (error) throw error;
    }

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
