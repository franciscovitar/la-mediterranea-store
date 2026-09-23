export default function CheckoutLoading() {
  return (
    <main className="checkout-shell" aria-label="Cargando checkout" aria-busy="true">
      <div className="checkout-page">
        <header className="checkout-header">
          <a className="brand" href="/"><img alt="" src="/brand/logo.png" /><span>La Mediterránea</span></a>
          <a className="checkout-back" href="/">← Seguir viendo productos</a>
        </header>
        <span className="skeleton-block sk-checkout-title" />
        <span className="skeleton-block sk-checkout-lead" />
        <div className="checkout-grid skeleton-checkout-grid">
          <section className="checkout-card">
            <span className="skeleton-block sk-card-heading" />
            <span className="skeleton-block sk-order-line" />
            <span className="skeleton-block sk-order-line" />
            <span className="skeleton-block sk-total-line" />
          </section>
          <aside className="checkout-card">
            <span className="skeleton-block sk-card-heading" />
            <span className="skeleton-block sk-form-line" />
            <span className="skeleton-block sk-form-input" />
            <span className="skeleton-block sk-form-button" />
          </aside>
        </div>
      </div>
    </main>
  );
}
