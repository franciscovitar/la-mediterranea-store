"use client";

import { useEffect, useState } from "react";
import { Storefront } from "@/components/Storefront";
import {
  ADMIN_PREVIEW_CART_STORAGE_KEY,
  ADMIN_PRODUCTS_STORAGE_KEY,
  cloneProducts,
  validateDraftProducts,
} from "@/lib/admin/draft";
import type { Product } from "@/lib/products";

export function DraftStorefrontPreview({ initialProducts }: { initialProducts: Product[] }) {
  const [catalog, setCatalog] = useState<Product[] | null>(null);
  const [source, setSource] = useState<"draft" | "base">("base");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(ADMIN_PRODUCTS_STORAGE_KEY);
      if (saved) {
        setCatalog(validateDraftProducts(JSON.parse(saved)));
        setSource("draft");
        return;
      }
    } catch {
      // Fall back to the checked-in catalog.
    }
    setCatalog(cloneProducts(initialProducts));
    setSource("base");
  }, [initialProducts]);

  if (!catalog) {
    return <main className="checkout-shell"><div className="checkout-page"><p className="checkout-help">Cargando vista previa…</p></div></main>;
  }

  return (
    <>
      {source === "base" ? (
        <div className="draft-preview-fallback">
          No hay un borrador local guardado. Se está mostrando el catálogo base.
        </div>
      ) : null}
      <Storefront
        catalog={catalog}
        cartStorageKey={ADMIN_PREVIEW_CART_STORAGE_KEY}
        checkoutHref={null}
        previewMode
      />
    </>
  );
}
