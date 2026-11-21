import { requireCauceStaff } from "@/lib/cauce/auth";
import { merchantError, merchantJson } from "@/lib/cauce/http";
import { checkSameOrigin, CauceValidationError, validateCauceProduct } from "@/lib/cauce/validation";
import { readJsonBody } from "@/lib/http/request";

export async function POST(request: Request) {
  try {
    checkSameOrigin(request);
    const client = await requireCauceStaff();
    const product = validateCauceProduct(await readJsonBody(request));
    const { error } = await client.from("cauce_products").insert(product);
    if (error) throw error;
    return merchantJson({ product }, 201);
  } catch (error) { return merchantError(error); }
}

export async function PATCH(request: Request) {
  try {
    checkSameOrigin(request);
    const client = await requireCauceStaff();
    const product = validateCauceProduct(await readJsonBody(request));
    const { id, slug, ...editable } = product;
    if (id !== slug) throw new CauceValidationError("El identificador no puede cambiar.");
    const { data, error } = await client.from("cauce_products").update(editable).eq("id", id).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return merchantJson({ error: "Producto no encontrado." }, 404);
    return merchantJson({ product });
  } catch (error) { return merchantError(error); }
}
