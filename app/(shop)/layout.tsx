import { CauceCartProvider } from "@/components/cauce/CauceCartProvider";
import { CauceHeader } from "@/components/cauce/CauceHeader";
import { CauceFooter } from "@/components/cauce/CauceFooter";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <CauceCartProvider><CauceHeader />{children}<CauceFooter /></CauceCartProvider>;
}
