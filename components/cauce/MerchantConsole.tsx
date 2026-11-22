"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/products";
import type { MerchantData } from "@/lib/cauce/operations";
import { cauceBrowserAuth } from "@/lib/cauce/auth-browser";

type Product = MerchantData["products"][number];
type Section = "resumen" | "catalogo" | "inventario" | "pedidos";
const orderStates: Record<string, string> = {
  pending: "Pendiente de pago", paid_test: "Pago de prueba aprobado",
  failed_test: "Pago rechazado", cancelled: "Cancelado", needs_review: "Requiere revisión",
};
const images = [
  ...Array.from({ length: 6 }, (_, index) => `/cauce/catalog-a-0${index}.webp`),
  ...Array.from({ length: 6 }, (_, index) => `/cauce/catalog-b-0${index}.webp`),
];

const emptyProduct: Product = {
  id: "", slug: "", name: "", category: "Mesa", price: 0, image: images[0],
  description: "", material: "", dimensions: "", care: "", badge: null, featured: false, active: false,
};

function ProductEditor({ product, onCancel, onSave, pending }: {
  product: Product;
  pending: boolean;
  onCancel: () => void;
  onSave: (product: Product, creating: boolean) => void;
}) {
  const creating = !product.id;
  const [value, setValue] = useState<Product>({ ...product });
  const update = (field: keyof Product, next: string | number | boolean | null) => setValue((current) => ({ ...current, [field]: next }));
  return <form className="c-merchant-editor" onSubmit={(event) => { event.preventDefault(); onSave(value, creating); }}>
    <div className="c-merchant-panel-head"><h3>{creating ? "Nuevo producto" : `Editar ${product.name}`}</h3><button type="button" onClick={onCancel}>Cancelar</button></div>
    <div className="c-merchant-form-grid">
      <label>Identificador / URL<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" disabled={!creating} value={value.slug} onChange={(e) => {
        update("slug", e.target.value.toLowerCase());
      }} placeholder="ej. manta-sierra" /></label>
      <label>Nombre<input required minLength={2} maxLength={120} value={value.name} onChange={(e) => update("name", e.target.value)} /></label>
      <label>Categoría<input required maxLength={60} value={value.category} onChange={(e) => update("category", e.target.value)} /></label>
      <label>Precio (ARS)<input type="number" required min={0} max={100000000} step={1} value={value.price} onChange={(e) => update("price", Number(e.target.value))} /></label>
      <label>Imagen existente<select value={value.image} onChange={(e) => update("image", e.target.value)}>{images.map((item) => <option key={item} value={item}>{item.split("/").pop()}</option>)}</select></label>
      <label>Etiqueta<input maxLength={60} value={value.badge ?? ""} onChange={(e) => update("badge", e.target.value || null)} placeholder="Ej. Nuevo" /></label>
      <label className="c-wide">Descripción<textarea rows={3} maxLength={1000} value={value.description} onChange={(e) => update("description", e.target.value)} /></label>
      <label>Material<input maxLength={200} value={value.material} onChange={(e) => update("material", e.target.value)} /></label>
      <label>Medidas<input maxLength={200} value={value.dimensions} onChange={(e) => update("dimensions", e.target.value)} /></label>
      <label className="c-wide">Cuidados<input maxLength={400} value={value.care} onChange={(e) => update("care", e.target.value)} /></label>
    </div>
    <div className="c-merchant-checks"><label><input type="checkbox" checked={value.active} onChange={(e) => update("active", e.target.checked)} /> Visible en la tienda</label>
      <label><input type="checkbox" checked={value.featured} onChange={(e) => update("featured", e.target.checked)} /> Destacado en portada</label></div>
    <button className="c-button c-button-dark" disabled={pending} type="submit">{pending ? "Guardando…" : creating ? "Crear producto" : "Guardar cambios"}</button>
  </form>;
}

function StockEditor({ product, stock, version, pending, onCancel, onSave }: {
  product: Product; stock: number; version: number; pending: boolean;
  onCancel: () => void; onSave: (stock: number, reason: string) => void;
}) {
  const [quantity, setQuantity] = useState(stock);
  const [reason, setReason] = useState("");
  return <form className="c-merchant-editor" onSubmit={(e) => { e.preventDefault(); onSave(quantity, reason); }}>
    <div className="c-merchant-panel-head"><h3>{product.name} · Stock</h3><button type="button" onClick={onCancel}>Cancelar</button></div>
    <p>Stock actual: <strong>{stock}</strong> · revisión {version}. Un cambio concurrente se rechaza hasta recargar.</p>
    <div className="c-merchant-form-grid">
      <label>Nueva disponibilidad<input type="number" required min={0} max={1000000} step={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} /></label>
      <label>Motivo del ajuste<input required minLength={3} maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ingreso, recuento, corrección…" /></label>
    </div>
    <button className="c-button c-button-dark" type="submit" disabled={pending}>{pending ? "Actualizando…" : "Registrar ajuste"}</button>
  </form>;
}

export function MerchantConsole({ initial }: { initial: MerchantData }) {
  const [data, setData] = useState(initial);
  const [section, setSection] = useState<Section>("resumen");
  const [editing, setEditing] = useState<Product | null>(null);
  const [stockId, setStockId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const stock = new Map(data.inventory.map((item) => [item.product_id, item]));
  const lowStock = data.products.filter((product) => product.active && (stock.get(product.id)?.stock ?? 0) <= 5);

  async function request(path: string, body: unknown, method = "POST") {
    setPending(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(path, {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), credentials: "same-origin",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo completar la operación.");
      const refreshed = await fetch("/api/cauce/merchant", { cache: "no-store" });
      if (!refreshed.ok) throw new Error("Se guardó el cambio, pero no pudimos actualizar la vista. Recargá la página.");
      setData(await refreshed.json());
      setNotice("Cambios guardados correctamente.");
      setEditing(null);
      setStockId(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Error desconocido."); }
    finally { setPending(false); }
  }

  const handleProduct = (product: Product, creating: boolean) => {
    const { id: _id, ...fields } = product;
    void request("/api/cauce/merchant/products", fields, creating ? "POST" : "PATCH");
  };
  const rows = data.products.filter((product) => product.active);

  return <div className="c-merchant-wrap">
    <header className="c-merchant-head"><a href="/" className="c-logo">cauce<span>.</span></a>
      <div><a href="/" target="_blank" rel="noopener noreferrer">Ver tienda ↗</a>
        <button type="button" onClick={async () => { await cauceBrowserAuth().auth.signOut(); window.location.assign("/gestion"); }}>Cerrar sesión</button></div>
    </header>
    <div className="c-merchant-title"><div><span className="c-overline">Panel comercial</span><h1>Buen día, equipo.</h1><p>Catálogo, inventario y actividad de la tienda.</p></div><span className="c-merchant-live">Cauce · Gestión</span></div>
    <nav className="c-merchant-tabs" aria-label="Secciones de gestión">
      {([["resumen","Resumen"],["catalogo","Productos"],["inventario","Inventario"],["pedidos","Pedidos"]] as [Section,string][]).map(([key,label]) =>
        <button key={key} type="button" className={section === key ? "is-active" : ""} onClick={() => { setSection(key); setEditing(null); setStockId(null); setError(""); setNotice(""); }}>{label}</button>)}
    </nav>
    {error && <p role="alert" className="c-merchant-feedback is-error">{error}</p>}
    {notice && <p role="status" className="c-merchant-feedback">{notice}</p>}

    {section === "resumen" && <>
      <div className="c-merchant-stats"><div><span>Productos activos</span><strong>{rows.length}</strong></div><div><span>Unidades disponibles</span><strong>{data.inventory.reduce((sum,item)=>sum + item.stock,0)}</strong></div><div><span>Stock bajo (≤5)</span><strong>{lowStock.length}</strong></div><div><span>Pedidos</span><strong>{data.orders.length}</strong></div></div>
      <section className="c-merchant-card"><div className="c-merchant-panel-head"><h2>Atención al inventario</h2><button type="button" onClick={() => setSection("inventario")}>Ver inventario ↗</button></div>
        {lowStock.length ? lowStock.map((product) => <p className="c-merchant-activity" key={product.id}><span>{product.name}</span><strong>{stock.get(product.id)?.stock ?? 0} disponibles</strong></p>) :
          <p className="c-merchant-muted">No hay artículos por debajo del umbral.</p>}</section>
      <section className="c-merchant-card"><h2>Últimos movimientos</h2>
        {data.movements.length ? data.movements.map((item) => <p className="c-merchant-activity" key={item.id}><span>{item.product_id} · {item.reason}</span><strong>{item.previous_stock} → {item.new_stock}</strong></p>) :
          <p className="c-merchant-muted">Los ajustes de inventario van a aparecer acá.</p>}</section>
    </>}

    {section === "catalogo" && <section className="c-merchant-card">
      <div className="c-merchant-panel-head"><div><h2>Productos</h2><p>{data.products.length} referencias · {rows.length} visibles</p></div>
        <button className="c-merchant-add" type="button" onClick={() => setEditing({ ...emptyProduct })}>+ Nuevo producto</button></div>
      {editing && <ProductEditor key={editing.id || "new"} product={editing} pending={pending} onCancel={() => setEditing(null)} onSave={handleProduct} />}
      <div className="c-merchant-table-wrap"><table><thead><tr><th>Producto</th><th>Precio</th><th>Disponibles</th><th>Estado</th><th></th></tr></thead><tbody>
        {data.products.map((product) => <tr key={product.id}><td><strong>{product.name}</strong><span>{product.category} · {product.slug}</span></td><td>{formatMoney(product.price)}</td><td>{stock.get(product.id)?.stock ?? 0}</td><td>{product.active ? "Publicado" : "Oculto"}</td><td><button type="button" onClick={() => setEditing(product)}>Editar</button></td></tr>)}
      </tbody></table></div>
    </section>}

    {section === "inventario" && <section className="c-merchant-card">
      <div className="c-merchant-panel-head"><div><h2>Inventario</h2><p>Disponibilidad por referencia, con registro de ajustes.</p></div></div>
      {stockId && (() => { const product = data.products.find((item) => item.id === stockId); const row = stock.get(stockId); return product && row ?
        <StockEditor key={stockId} product={product} stock={row.stock} version={row.version} pending={pending} onCancel={() => setStockId(null)}
          onSave={(quantity, reason) => void request("/api/cauce/merchant/stock", { productId: stockId, expectedVersion: row.version, stock: quantity, reason })} /> : null; })()}
      <div className="c-merchant-table-wrap"><table><thead><tr><th>Referencia</th><th>Stock</th><th>Revisión</th><th>Último cambio</th><th></th></tr></thead><tbody>
        {data.products.map((product) => { const row = stock.get(product.id); return <tr key={product.id}><td><strong>{product.name}</strong><span>{product.id}</span></td><td><b className={row?.stock === 0 ? "c-stock-zero" : ""}>{row?.stock ?? 0}</b></td><td>{row?.version ?? 0}</td><td>{row?.updated_at ? new Date(row.updated_at).toLocaleDateString("es-AR") : "Sin registro"}</td><td><button type="button" disabled={!row} onClick={() => setStockId(product.id)}>Ajustar</button></td></tr>; })}
      </tbody></table></div>
    </section>}

    {section === "pedidos" && <section className="c-merchant-card">
      <div className="c-merchant-panel-head"><div><h2>Pedidos</h2><p>Actividad comercial registrada por el servidor.</p></div></div>
      {data.orders.length ? <div className="c-merchant-table-wrap"><table><thead><tr><th>Pedido</th><th>Estado</th><th>Total</th><th>Fecha</th></tr></thead><tbody>
        {data.orders.map((order) => <tr key={order.id}><td><strong>{order.id.slice(0,8)}</strong></td><td>{orderStates[order.status] ?? "Estado desconocido"}</td><td>{formatMoney(order.total_amount)}</td><td>{new Date(order.created_at).toLocaleDateString("es-AR")}</td></tr>)}
      </tbody></table></div> : <div className="c-merchant-empty"><h3>Sin pedidos todavía</h3><p>Cuando se habilite el proceso de compra, los pedidos registrados van a aparecer acá.</p></div>}
    </section>}
  </div>;
}
