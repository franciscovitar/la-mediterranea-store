import { AdminPanel } from "@/components/AdminPanel";
import { getIntegrationReadiness } from "@/lib/integrations/config";
import { readCatalog } from "@/lib/integrations/supabase/catalog";
import { AdminAuthorizationError, requireAdmin } from "@/lib/admin/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const readiness = getIntegrationReadiness();
  let supabase;
  try {
    supabase = await requireAdmin();
  } catch (error) {
    if (error instanceof AdminAuthorizationError) redirect("/admin/login");
    throw error;
  }
  const products = await readCatalog(supabase);

  return (
    <main className="checkout-shell admin-shell">
      <div className="admin-page">
        <header className="checkout-header admin-header">
          <a className="brand" href="/"><img alt="" src="/brand/logo.png" /><span>La Mediterránea</span></a>
          <a className="checkout-back" href="/">← Tienda</a>
        </header>

        <div className="admin-title-row">
          <div>
            <span className="eyebrow">Panel interno</span>
            <h1 className="checkout-title">Administración</h1>
            <p className="checkout-lead">Los cambios se guardan en Supabase y quedan disponibles al recargar.</p>
          </div>
          <span className="admin-draft-badge">Supabase</span>
        </div>

        <AdminPanel initialProducts={products} readiness={readiness} />
      </div>
    </main>
  );
}
