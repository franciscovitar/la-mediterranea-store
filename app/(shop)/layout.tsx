import { CauceCartProvider } from "@/components/cauce/CauceCartProvider";
import { CauceHeader } from "@/components/cauce/CauceHeader";
import { CauceFooter } from "@/components/cauce/CauceFooter";
import { getCauceProducts } from "@/lib/cauce/backend";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  return <CauceCartProvider products={await getCauceProducts()}><CauceHeader />{children}<CauceFooter /></CauceCartProvider>;
}
