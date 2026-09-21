import { Storefront } from "@/components/Storefront";
import { ADMIN_PREVIEW_CART_STORAGE_KEY } from "@/lib/admin/draft";
import { AdminAuthorizationError, requireAdmin } from "@/lib/admin/auth";
import { readCatalog } from "@/lib/integrations/supabase/catalog";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminPreviewPage() {
  try {
    const catalog = await readCatalog(await requireAdmin());
    return <Storefront catalog={catalog} cartStorageKey={ADMIN_PREVIEW_CART_STORAGE_KEY} checkoutHref={null} previewMode />;
  } catch (error) {
    if (error instanceof AdminAuthorizationError) redirect("/admin/login");
    throw error;
  }
}
