"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  ADMIN_INVENTORY_STORAGE_KEY,
  ADMIN_PRODUCTS_STORAGE_KEY,
  cloneProducts,
  inventoryVariants,
  slugify,
  validateDraftProducts,
  type DraftInventory,
} from "@/lib/admin/draft";
import type { IntegrationReadiness } from "@/lib/integrations/config";
import type { Product, ProductColor } from "@/lib/products";
import { formatMoney } from "@/lib/products";

type View = "products" | "inventory" | "orders" | "integrations";

type ProductForm = Omit<Product, "colors" | "sizes"> & {
  colors: ProductColor[];
  sizes: string[];
};

function blankProduct(): ProductForm {
  return {
    id: "",
    category: "",
    name: "",
    price: 0,
    description: "",
    image: "",
    note: "",
    colors: [],
    sizes: [],
    active: true,
  };
}

function toForm(product: Product): ProductForm {
  return {
    ...product,
    note: product.note ?? "",
    colors: product.colors?.map((color) => ({ ...color })) ?? [],
    sizes: product.sizes ? [...product.sizes] : [],
  };
}

function normalizeForm(form: ProductForm): Product {
  const id = form.id.trim() || slugify(form.name);
  if (!id) throw new Error("Ingresá un nombre o un ID.");
  if (!form.name.trim()) throw new Error("Ingresá el nombre del producto.");
  if (!form.category.trim()) throw new Error("Ingresá una categoría.");
  if (!form.image.trim()) throw new Error("Ingresá una ruta o URL de imagen.");
  if (!Number.isFinite(form.price) || form.price < 0) throw new Error("El precio no es válido.");

  const colors = form.colors
    .filter((color) => color.label.trim() || color.key.trim())
    .map((color) => ({
      key: color.key.trim() || slugify(color.label),
      label: color.label.trim() || color.key.trim(),
      swatch: color.swatch.trim() || "#d9d0c5",
      image: color.image.trim() || form.image.trim(),
    }));

  const colorKeys = new Set<string>();
  for (const color of colors) {
    if (!color.key) throw new Error("Hay un color sin clave.");
    if (colorKeys.has(color.key)) throw new Error("Hay claves de color repetidas.");
    colorKeys.add(color.key);
  }

  const sizes = Array.from(new Set(form.sizes.map((size) => size.trim()).filter(Boolean)));

  return {
    id,
    category: form.category.trim(),
    name: form.name.trim(),
    price: form.price,
    description: form.description.trim(),
    image: form.image.trim(),
    note: form.note?.trim() || undefined,
    colors: colors.length ? colors : undefined,
    sizes: sizes.length ? sizes : undefined,
    active: form.active,
  };
}

function downloadText(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function AdminPanel({
  initialProducts,
  readiness,
}: {
  initialProducts: Product[];
  readiness: IntegrationReadiness;
}) {
  const [view, setView] = useState<View>("products");
  const [products, setProducts] = useState<Product[]>(() => cloneProducts(initialProducts));
  const [inventory, setInventory] = useState<DraftInventory>({});
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialProducts[0]?.id ?? null);
  const [form, setForm] = useState<ProductForm>(() => initialProducts[0] ? toForm(initialProducts[0]) : blankProduct());
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const savedProducts = window.localStorage.getItem(ADMIN_PRODUCTS_STORAGE_KEY);
      const savedInventory = window.localStorage.getItem(ADMIN_INVENTORY_STORAGE_KEY);

      if (savedProducts) {
        const parsed = validateDraftProducts(JSON.parse(savedProducts));
        setProducts(parsed);
        const first = parsed[0];
        setSelectedId(first?.id ?? null);
        setForm(first ? toForm(first) : blankProduct());
      }
      if (savedInventory) {
        const parsed = JSON.parse(savedInventory) as DraftInventory;
        setInventory(parsed ?? {});
      }
    } catch {
      setError("No se pudo leer el borrador local. Se cargó el catálogo base.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    window.localStorage.setItem(ADMIN_PRODUCTS_STORAGE_KEY, JSON.stringify(products));
  }, [loaded, products]);

  useEffect(() => {
    if (!loaded) return;
    window.localStorage.setItem(ADMIN_INVENTORY_STORAGE_KEY, JSON.stringify(inventory));
  }, [inventory, loaded]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) =>
      [product.name, product.category, product.id].some((value) => value.toLowerCase().includes(query))
    );
  }, [products, search]);

  const variants = useMemo(() => inventoryVariants(products), [products]);
  const trackedRows = variants.filter((row) => inventory[row.key]?.tracked).length;

  function selectProduct(product: Product) {
    setSelectedId(product.id);
    setForm(toForm(product));
    setNotice("");
    setError("");
  }

  function newProduct() {
    setSelectedId(null);
    setForm(blankProduct());
    setNotice("");
    setError("");
    setView("products");
  }

  function saveProduct() {
    setError("");
    setNotice("");
    try {
      const normalized = normalizeForm(form);
      const collision = products.some((product) => product.id === normalized.id && product.id !== selectedId);
      if (collision) throw new Error("Ya existe un producto con ese ID.");

      setProducts((current) => {
        if (selectedId && current.some((product) => product.id === selectedId)) {
          return current.map((product) => product.id === selectedId ? normalized : product);
        }
        return [...current, normalized];
      });
      setSelectedId(normalized.id);
      setForm(toForm(normalized));
      setNotice("Borrador guardado en este navegador.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo guardar el producto.");
    }
  }

  function removeProduct() {
    if (!selectedId) return;
    const selected = products.find((product) => product.id === selectedId);
    if (!selected) return;
    if (!window.confirm("¿Eliminar " + selected.name + " del borrador local?")) return;

    const next = products.filter((product) => product.id !== selectedId);
    setProducts(next);
    const first = next[0];
    setSelectedId(first?.id ?? null);
    setForm(first ? toForm(first) : blankProduct());
    setNotice("Producto eliminado del borrador local.");
  }

  function duplicateProduct() {
    const normalized = normalizeForm(form);
    setSelectedId(null);
    setForm({
      ...toForm(normalized),
      id: "",
      name: normalized.name + " copia",
    });
    setNotice("Se creó una copia editable. Guardala para agregarla.");
  }

  function resetCatalog() {
    if (!window.confirm("¿Restaurar el catálogo base y descartar el borrador local de productos?")) return;
    const base = cloneProducts(initialProducts);
    setProducts(base);
    const first = base[0];
    setSelectedId(first?.id ?? null);
    setForm(first ? toForm(first) : blankProduct());
    setNotice("Catálogo base restaurado.");
    setError("");
  }

  async function importCatalog(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const parsed = validateDraftProducts(JSON.parse(await file.text()));
      setProducts(parsed);
      const first = parsed[0];
      setSelectedId(first?.id ?? null);
      setForm(first ? toForm(first) : blankProduct());
      setNotice("Catálogo importado al borrador local.");
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo importar el archivo.");
    }
  }

  function exportProducts() {
    downloadText(
      "la-mediterranea-productos-borrador.json",
      JSON.stringify(products, null, 2),
      "application/json;charset=utf-8"
    );
  }

  function exportInventory() {
    const header = ["product_id", "product_name", "variant", "tracked", "stock"];
    const rows = variants.map((row) => {
      const entry = inventory[row.key] ?? { tracked: false, stock: 0 };
      return [row.productId, row.productName, row.variantLabel, String(entry.tracked), String(entry.stock)];
    });
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => "\"" + cell.replace(/\"/g, "\"\"") + "\"").join(","))
      .join("\n");
    downloadText("la-mediterranea-stock-borrador.csv", csv, "text/csv;charset=utf-8");
  }

  function updateColor(index: number, patch: Partial<ProductColor>) {
    setForm((current) => ({
      ...current,
      colors: current.colors.map((color, colorIndex) => colorIndex === index ? { ...color, ...patch } : color),
    }));
  }

  return (
    <>
      <div className="admin-summary">
        <div className="admin-summary-card"><span>Productos</span><strong>{products.length}</strong><small>{products.filter((product) => product.active).length} activos</small></div>
        <div className="admin-summary-card"><span>Stock</span><strong>{trackedRows}</strong><small>variantes controladas</small></div>
        <div className="admin-summary-card"><span>Pedidos</span><strong>—</strong><small>se activa con Supabase</small></div>
        <div className="admin-summary-card"><span>Modo</span><strong>Local</strong><small>borrador seguro</small></div>
      </div>

      <nav className="admin-tabs" aria-label="Secciones de administración">
        <button className={view === "products" ? "is-active" : ""} onClick={() => setView("products")} type="button">Productos</button>
        <button className={view === "inventory" ? "is-active" : ""} onClick={() => setView("inventory")} type="button">Stock</button>
        <button className={view === "orders" ? "is-active" : ""} onClick={() => setView("orders")} type="button">Pedidos</button>
        <button className={view === "integrations" ? "is-active" : ""} onClick={() => setView("integrations")} type="button">Conexiones</button>
      </nav>

      <div className="admin-local-banner">
        <div>
          <strong>Panel funcional en modo borrador local</strong>
          <p>Podés agregar, editar y preparar productos y stock ahora. Los cambios quedan guardados solamente en este navegador hasta conectar Supabase.</p>
        </div>
        <span>No publica cambios</span>
      </div>

      {notice ? <div className="admin-notice">{notice}</div> : null}
      {error ? <div className="checkout-error admin-global-error">{error}</div> : null}

      {view === "products" ? (
        <section className="admin-section">
          <div className="admin-section-head">
            <div><h2>Productos</h2><p>Prepará el catálogo real sin esperar la base de datos.</p></div>
            <div className="admin-actions">
              <button className="admin-button secondary" onClick={exportProducts} type="button">Exportar JSON</button>
              <button className="admin-button secondary" onClick={() => importRef.current?.click()} type="button">Importar JSON</button>
              <input accept="application/json,.json" hidden onChange={importCatalog} ref={importRef} type="file" />
              <button className="admin-button primary" onClick={newProduct} type="button">+ Nuevo producto</button>
            </div>
          </div>

          <div className="admin-workspace">
            <aside className="admin-product-list">
              <div className="admin-search">
                <input onChange={(event) => setSearch(event.target.value)} placeholder="Buscar producto…" type="search" value={search} />
              </div>
              <div className="admin-product-list-scroll">
                {filteredProducts.map((product) => (
                  <button className={"admin-product-row " + (selectedId === product.id ? "is-selected" : "")} key={product.id} onClick={() => selectProduct(product)} type="button">
                    <img alt="" src={product.image || "/brand/logo.png"} />
                    <span><strong>{product.name}</strong><small>{product.category} · {formatMoney(product.price)}</small></span>
                    <i className={product.active ? "active" : "inactive"}>{product.active ? "Activo" : "Oculto"}</i>
                  </button>
                ))}
                {!filteredProducts.length ? <p className="admin-empty-list">No hay productos que coincidan.</p> : null}
              </div>
              <button className="admin-reset" onClick={resetCatalog} type="button">Restaurar catálogo base</button>
            </aside>

            <div className="admin-editor">
              <div className="admin-editor-head">
                <div>
                  <span className="eyebrow">{selectedId ? "Editar producto" : "Nuevo producto"}</span>
                  <h3>{form.name || "Producto sin nombre"}</h3>
                </div>
                <div className="admin-actions">
                  {selectedId ? <button className="admin-button secondary" onClick={duplicateProduct} type="button">Duplicar</button> : null}
                  {selectedId ? <button className="admin-button danger" onClick={removeProduct} type="button">Eliminar</button> : null}
                </div>
              </div>

              <div className="admin-form-grid">
                <label className="admin-field wide">
                  <span>Nombre</span>
                  <input onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Ej: Remera oficial" value={form.name} />
                </label>
                <label className="admin-field">
                  <span>Categoría</span>
                  <input onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} placeholder="Remeras" value={form.category} />
                </label>
                <label className="admin-field">
                  <span>Precio</span>
                  <input min="0" onChange={(event) => setForm((current) => ({ ...current, price: Number(event.target.value) }))} step="1" type="number" value={form.price} />
                </label>
                <label className="admin-field wide">
                  <span>ID interno</span>
                  <div className="admin-inline-field">
                    <input onChange={(event) => setForm((current) => ({ ...current, id: event.target.value }))} placeholder="Se genera desde el nombre al guardar" value={form.id} />
                    <button onClick={() => setForm((current) => ({ ...current, id: slugify(current.name) }))} type="button">Generar</button>
                  </div>
                </label>
                <label className="admin-field wide">
                  <span>Descripción</span>
                  <textarea onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Descripción breve para la tienda" rows={3} value={form.description} />
                </label>
                <label className="admin-field wide">
                  <span>Imagen principal</span>
                  <input onChange={(event) => setForm((current) => ({ ...current, image: event.target.value }))} placeholder="/products/producto.jpg o https://…" value={form.image} />
                  <small>La subida de archivos se conecta después a Storage. Por ahora podés preparar la ruta o URL.</small>
                </label>
                <label className="admin-field wide">
                  <span>Nota opcional</span>
                  <input onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} placeholder="Ej: Todos los talles disponibles" value={form.note ?? ""} />
                </label>
                <label className="admin-field wide">
                  <span>Talles</span>
                  <input
                    onChange={(event) => setForm((current) => ({ ...current, sizes: event.target.value.split(",").map((value) => value.trim()) }))}
                    placeholder="S, M, L, XL"
                    value={form.sizes.join(", ")}
                  />
                  <small>Separalos con comas. Si el producto no tiene talle, dejalo vacío.</small>
                </label>
              </div>

              <div className="admin-subsection">
                <div className="admin-subsection-head">
                  <div><h4>Colores / variantes visuales</h4><p>Podés dejarlo vacío si el producto no tiene colores.</p></div>
                  <button className="admin-button secondary" onClick={() => setForm((current) => ({
                    ...current,
                    colors: [...current.colors, { key: "", label: "", swatch: "#d9d0c5", image: current.image }],
                  }))} type="button">+ Agregar color</button>
                </div>

                <div className="admin-colors">
                  {form.colors.map((color, index) => (
                    <div className="admin-color-row" key={index}>
                      <input aria-label="Color" onChange={(event) => updateColor(index, { swatch: event.target.value })} type="color" value={color.swatch || "#d9d0c5"} />
                      <input onChange={(event) => updateColor(index, { label: event.target.value })} placeholder="Nombre" value={color.label} />
                      <input onChange={(event) => updateColor(index, { key: event.target.value })} placeholder="Clave" value={color.key} />
                      <input onChange={(event) => updateColor(index, { image: event.target.value })} placeholder="Imagen" value={color.image} />
                      <button aria-label="Quitar color" onClick={() => setForm((current) => ({ ...current, colors: current.colors.filter((_, colorIndex) => colorIndex !== index) }))} type="button">×</button>
                    </div>
                  ))}
                  {!form.colors.length ? <p className="admin-muted">Sin variantes de color.</p> : null}
                </div>
              </div>

              <div className="admin-active-row">
                <label>
                  <input checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} type="checkbox" />
                  <span>Producto visible / activo</span>
                </label>
              </div>

              <div className="admin-preview-card">
                <div className="admin-preview-image"><img alt="" src={form.image || "/brand/logo.png"} /></div>
                <div>
                  <span>{form.category || "Categoría"}</span>
                  <h4>{form.name || "Nombre del producto"}</h4>
                  <p>{form.description || "La descripción va a verse acá."}</p>
                  <strong>{formatMoney(Number.isFinite(form.price) ? form.price : 0)}</strong>
                </div>
              </div>

              <div className="admin-save-bar">
                <div>
                  <strong>Esto todavía no publica en la tienda.</strong>
                  <span>Guardamos el borrador para que después Supabase reemplace esta persistencia local.</span>
                </div>
                <button className="admin-button primary" onClick={saveProduct} type="button">Guardar borrador</button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {view === "inventory" ? (
        <section className="admin-section">
          <div className="admin-section-head">
            <div><h2>Stock</h2><p>Prepará qué variantes querés controlar y cuántas unidades tienen.</p></div>
            <button className="admin-button secondary" onClick={exportInventory} type="button">Exportar CSV</button>
          </div>

          <div className="admin-stock-table">
            <div className="admin-stock-head"><span>Producto</span><span>Variante</span><span>Controlar</span><span>Unidades</span></div>
            {variants.map((row) => {
              const entry = inventory[row.key] ?? { tracked: false, stock: 0 };
              return (
                <div className="admin-stock-row" key={row.key}>
                  <span><strong>{row.productName}</strong><small>{row.productId}</small></span>
                  <span>{row.variantLabel}</span>
                  <label className="admin-switch">
                    <input
                      checked={entry.tracked}
                      onChange={(event) => setInventory((current) => ({
                        ...current,
                        [row.key]: { ...entry, tracked: event.target.checked },
                      }))}
                      type="checkbox"
                    />
                    <i />
                  </label>
                  <input
                    disabled={!entry.tracked}
                    min="0"
                    onChange={(event) => setInventory((current) => ({
                      ...current,
                      [row.key]: { ...entry, stock: Math.max(0, Number(event.target.value) || 0) },
                    }))}
                    type="number"
                    value={entry.stock}
                  />
                </div>
              );
            })}
          </div>
          <p className="admin-footnote">Si una variante queda sin “Controlar”, la integración preparada la trata como stock no administrado hasta que decidas cargarlo en Supabase.</p>
        </section>
      ) : null}

      {view === "orders" ? (
        <section className="admin-section">
          <div className="admin-section-head"><div><h2>Pedidos</h2><p>La interfaz está reservada, pero no inventamos ventas que todavía no existen.</p></div></div>
          <div className="admin-orders-empty">
            <div className="admin-orders-icon">✓</div>
            <h3>Listo para conectar pedidos reales</h3>
            <p>Cuando Supabase y Mercado Pago estén activos, acá van a aparecer número de pedido, fecha, cliente, total, estado de pago y detalle de productos.</p>
            <div className="admin-order-columns">
              <span>Pedido</span><span>Cliente</span><span>Total</span><span>Estado</span>
            </div>
          </div>
        </section>
      ) : null}

      {view === "integrations" ? (
        <section className="admin-section">
          <div className="admin-section-head"><div><h2>Conexiones</h2><p>Estado real del backend, sin simular que algo está conectado.</p></div></div>
          <div className="admin-integration-cards">
            <div className="admin-integration-card"><span>Supabase servidor</span><strong className={readiness.supabaseServer ? "ready" : "pending"}>{readiness.supabaseServer ? "Listo" : "Pendiente"}</strong></div>
            <div className="admin-integration-card"><span>Supabase clave pública</span><strong className={readiness.supabasePublic ? "ready" : "pending"}>{readiness.supabasePublic ? "Lista" : "Pendiente"}</strong></div>
            <div className="admin-integration-card"><span>Mercado Pago API</span><strong className={readiness.mercadoPagoApi ? "ready" : "pending"}>{readiness.mercadoPagoApi ? "Lista" : "Pendiente"}</strong></div>
            <div className="admin-integration-card"><span>Webhook Mercado Pago</span><strong className={readiness.mercadoPagoWebhook ? "ready" : "pending"}>{readiness.mercadoPagoWebhook ? "Listo" : "Pendiente"}</strong></div>
          </div>
          <div className="checkout-status admin-connection-note">
            <strong>Siguiente conexión</strong>
            <p>Aplicar la migración y el seed de Supabase, crear el usuario administrador y reemplazar el guardado local por operaciones autenticadas contra la base.</p>
          </div>
        </section>
      ) : null}
    </>
  );
}
