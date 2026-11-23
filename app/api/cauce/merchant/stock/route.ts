import { requireCauceStaff } from "@/lib/cauce/auth";
import { merchantError, merchantJson } from "@/lib/cauce/http";
import { checkSameOrigin, validateStockAdjustment } from "@/lib/cauce/validation";
import { readJsonBody } from "@/lib/http/request";

export async function POST(request: Request) {
  try {
    checkSameOrigin(request);
    const client = await requireCauceStaff();
    const input = validateStockAdjustment(await readJsonBody(request));
    const { data, error } = await client.rpc("cauce_set_stock", {
      p_product_id: input.productId,
      p_expected_version: input.expectedVersion,
      p_stock: input.stock,
      p_reason: input.reason,
    });
    if (error) throw error;
    return merchantJson({ stock: data?.[0] });
  } catch (error) { return merchantError(error); }
}
