import { AdminPanel } from "@/components/AdminPanel";
import { AdminHandoffTools } from "@/components/AdminHandoffTools";
import { getIntegrationReadiness } from "@/lib/integrations/config";
import { products } from "@/lib/products";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  const readiness = getIntegrationReadiness();

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
            <p className="checkout-lead">Ya podés preparar productos y stock. Hasta conectar Supabase, todo queda como borrador local en este navegador.</p>
          </div>
          <span className="admin-draft-badge">Borrador local</span>
        </div>

        <AdminHandoffTools initialProducts={products} />
        <AdminPanel initialProducts={products} readiness={readiness} />
      </div>
    </main>
  );
}
