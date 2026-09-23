export default function HomeLoading() {
  return (
    <main className="page-skeleton" aria-label="Cargando tienda" aria-busy="true">
      <div className="skeleton-topbar">
        <div className="container skeleton-topbar-inner">
          <span className="skeleton-block sk-brand" />
          <span className="skeleton-block sk-cart" />
        </div>
      </div>
      <section className="skeleton-hero">
        <div className="container skeleton-hero-grid">
          <div>
            <span className="skeleton-block sk-eyebrow" />
            <span className="skeleton-block sk-title" />
            <span className="skeleton-block sk-title short" />
            <span className="skeleton-block sk-copy" />
            <span className="skeleton-block sk-copy shorter" />
            <div className="skeleton-actions">
              <span className="skeleton-block sk-button" />
              <span className="skeleton-block sk-button light" />
            </div>
          </div>
          <span className="skeleton-block sk-hero-card" />
        </div>
      </section>
      <section className="skeleton-catalog">
        <div className="container">
          <span className="skeleton-block sk-section-title" />
          <div className="skeleton-product-grid">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="skeleton-product-card" key={index}>
                <span className="skeleton-block sk-product-image" />
                <span className="skeleton-block sk-product-name" />
                <span className="skeleton-block sk-product-copy" />
                <span className="skeleton-block sk-product-price" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
