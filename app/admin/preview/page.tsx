import { DraftStorefrontPreview } from "@/components/DraftStorefrontPreview";
import { products } from "@/lib/products";

export default function AdminPreviewPage() {
  return <DraftStorefrontPreview initialProducts={products} />;
}
