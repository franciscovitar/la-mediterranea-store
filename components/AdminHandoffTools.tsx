"use client";

import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { type DraftInventory } from "@/lib/admin/draft";
import { buildAdminBackup, parseAdminBackup } from "@/lib/admin/export";
import type { Product } from "@/lib/products";

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

function inventoryCsv(inventory: DraftInventory) {
  const rows = [["product_id", "color_key", "size", "stock"]];
  for (const [key, entry] of Object.entries(inventory)) {
    if (!entry.tracked) continue;
    const [productId, colorKey = "", size = ""] = key.split("|");
    rows.push([productId, colorKey, size, String(entry.stock)]);
  }
  return rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\n") + "\n";
}

export function AdminHandoffTools({
  products,
  inventory,
  onRestore,
}: {
  products: Product[];
  inventory: DraftInventory;
  onRestore: (backup: ReturnType<typeof parseAdminBackup>) => Promise<void>;
}) {
  const [message, setMessage] = useState("");
  const [restoring, setRestoring] = useState(false);
  const backupInputRef = useRef<HTMLInputElement>(null);

  function exportBackup() {
    downloadText("la-mediterranea-supabase-backup.json", buildAdminBackup(products, inventory), "application/json;charset=utf-8");
    setMessage("Respaldo real de Supabase descargado.");
  }

  function exportCatalog() {
    downloadText("la-mediterranea-catalogo.json", JSON.stringify({ exportedAt: new Date().toISOString(), products }, null, 2), "application/json;charset=utf-8");
    setMessage("Catálogo real descargado.");
  }

  function exportInventory() {
    downloadText("la-mediterranea-stock.csv", inventoryCsv(inventory), "text/csv;charset=utf-8");
    setMessage("Stock real descargado.");
  }

  async function restoreBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const parsed = parseAdminBackup(JSON.parse(await file.text()));
      if (!window.confirm("¿Restaurar este respaldo en Supabase? Reemplazará productos, variantes y stock actuales. Los productos que no estén en el archivo quedarán ocultos.")) return;
      setRestoring(true);
      await onRestore(parsed);
      setMessage("Respaldo restaurado en Supabase.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo restaurar el respaldo.");
    } finally {
      setRestoring(false);
    }
  }

  return (
    <section className="admin-handoff-tools">
      <div>
        <strong>Operaciones sobre datos reales</strong>
        <p>Los respaldos y exportaciones se generan desde Supabase. Restaurar requiere confirmación y permisos de administrador.</p>
      </div>
      <div className="admin-actions">
        <a className="admin-button secondary admin-link-button" href="/admin/preview" target="_blank" rel="noreferrer">Vista previa real</a>
        <button className="admin-button secondary" onClick={exportBackup} type="button">Backup JSON</button>
        <button className="admin-button secondary" onClick={exportCatalog} type="button">Catálogo JSON</button>
        <button className="admin-button secondary" onClick={exportInventory} type="button">Stock CSV</button>
        <button className="admin-button primary" disabled={restoring} onClick={() => backupInputRef.current?.click()} type="button">{restoring ? "Restaurando…" : "Restaurar backup"}</button>
        <input accept="application/json,.json" hidden onChange={restoreBackup} ref={backupInputRef} type="file" />
      </div>
      {message ? <span className="admin-tool-message">{message}</span> : null}
    </section>
  );
}
