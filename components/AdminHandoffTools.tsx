"use client";

import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  ADMIN_INVENTORY_STORAGE_KEY,
  ADMIN_PRODUCTS_STORAGE_KEY,
  cloneProducts,
  validateDraftProducts,
  type DraftInventory,
} from "@/lib/admin/draft";
import { buildAdminBackup, buildSupabaseDraftSql, parseAdminBackup } from "@/lib/admin/export";
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

export function AdminHandoffTools({ initialProducts }: { initialProducts: Product[] }) {
  const [message, setMessage] = useState("");
  const backupInputRef = useRef<HTMLInputElement>(null);

  function readDraft() {
    const savedProducts = window.localStorage.getItem(ADMIN_PRODUCTS_STORAGE_KEY);
    const savedInventory = window.localStorage.getItem(ADMIN_INVENTORY_STORAGE_KEY);

    const products = savedProducts
      ? validateDraftProducts(JSON.parse(savedProducts))
      : cloneProducts(initialProducts);
    const inventory = savedInventory
      ? JSON.parse(savedInventory) as DraftInventory
      : {};

    return { products, inventory };
  }

  function exportBackup() {
    try {
      const draft = readDraft();
      downloadText(
        "la-mediterranea-admin-backup.json",
        buildAdminBackup(draft.products, draft.inventory),
        "application/json;charset=utf-8",
      );
      setMessage("Respaldo descargado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo generar el respaldo.");
    }
  }

  async function restoreBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const parsed = parseAdminBackup(JSON.parse(await file.text()));
      if (!window.confirm("¿Restaurar este respaldo? Va a reemplazar el borrador local actual de productos y stock.")) {
        return;
      }
      window.localStorage.setItem(ADMIN_PRODUCTS_STORAGE_KEY, JSON.stringify(parsed.products));
      window.localStorage.setItem(ADMIN_INVENTORY_STORAGE_KEY, JSON.stringify(parsed.inventory));
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo restaurar el respaldo.");
    }
  }

  function exportSql() {
    try {
      const draft = readDraft();
      downloadText(
        "la-mediterranea-supabase-import-inicial.sql",
        buildSupabaseDraftSql(draft.products, draft.inventory),
        "text/sql;charset=utf-8",
      );
      setMessage("SQL inicial para Supabase generado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo generar el SQL.");
    }
  }

  return (
    <section className="admin-handoff-tools">
      <div>
        <strong>Herramientas de preparación</strong>
        <p>Podés probar el catálogo como cliente y dejar un respaldo listo para la futura conexión.</p>
      </div>
      <div className="admin-actions">
        <a className="admin-button secondary admin-link-button" href="/admin/preview" target="_blank" rel="noreferrer">Ver tienda con borrador</a>
        <button className="admin-button secondary" onClick={exportBackup} type="button">Descargar respaldo</button>
        <button className="admin-button secondary" onClick={() => backupInputRef.current?.click()} type="button">Restaurar respaldo</button>
        <input accept="application/json,.json" hidden onChange={restoreBackup} ref={backupInputRef} type="file" />
        <button className="admin-button primary" onClick={exportSql} type="button">Generar SQL Supabase</button>
      </div>
      {message ? <span className="admin-tool-message">{message}</span> : null}
    </section>
  );
}
