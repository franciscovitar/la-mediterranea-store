import { requireCauceStaff } from "@/lib/cauce/auth";
import { merchantError, merchantJson } from "@/lib/cauce/http";
import { getMerchantData } from "@/lib/cauce/operations";

export async function GET() {
  try {
    return merchantJson(await getMerchantData(await requireCauceStaff()));
  } catch (error) { return merchantError(error); }
}
