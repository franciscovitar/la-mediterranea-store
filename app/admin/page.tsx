import { getIntegrationReadiness } from "@/lib/integrations/config";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  const readiness = getIntegrationReadiness();
  return (
    <main className="checkout-shell">
      <div className="checkout-page">
        <header className="checkout-header">
          <a className="brand" href="/"><img alt="" src="/brand/logo.png" /><span>La Mediterránea</span></a>
          <a className="checkout-back" href="/">← Tienda</a>
        </header>
        <h1 className="checkout-title">Administración</h1>
        <p className="checkout-lead">La estructura de datos y permisos está preparada. Los formularios de edición se habilitan cuando exista el proyecto Supabase real y podamos probar Supabase Auth sin inventar una seguridad falsa.</p>

        <section className="checkout-card admin-note">
          <h2>Estado de conexión</h2>
          <div className="integration-grid">
            <div className="integration-row"><span>Supabase servidor</span><b className={readiness.supabaseServer ? "ready" : "pending"}>{readiness.supabaseServer ? "Listo" : "Pendiente"}</b></div>
            <div className="integration-row"><span>Supabase clave pública</span><b className={readiness.supabasePublic ? "ready" : "pending"}>{readiness.supabasePublic ? "Lista" : "Pendiente"}</b></div>
            <div className="integration-row"><span>Mercado Pago API</span><b className={readiness.mercadoPagoApi ? "ready" : "pending"}>{readiness.mercadoPagoApi ? "Lista" : "Pendiente"}</b></div>
            <div className="integration-row"><span>Webhook Mercado Pago</span><b className={readiness.mercadoPagoWebhook ? "ready" : "pending"}>{readiness.mercadoPagoWebhook ? "Listo" : "Pendiente"}</b></div>
          </div>
          <div className="checkout-status">
            <strong>Qué falta para habilitar edición</strong>
            <p>Aplicar <code>supabase/migrations/20260920_001_commerce.sql</code>, cargar <code>supabase/seed.sql</code>, crear el usuario administrador en Supabase Auth y registrarlo en <code>admin_users</code>.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
