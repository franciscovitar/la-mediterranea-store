import type { Metadata, Viewport } from "next";
import { CauceCartProvider } from "@/components/cauce/CauceCartProvider";
import { CauceHeader } from "@/components/cauce/CauceHeader";
import { CauceFooter } from "@/components/cauce/CauceFooter";
import { getCauceProducts } from "@/lib/cauce/backend";
import "../cauce.css";

export const metadata: Metadata = {
  title: { absolute: "Cauce · Objetos para vivir", template: "%s · Cauce" },
  description: "Objetos de hogar, mesa y decoración para acompañar tus rituales cotidianos. Conocé la colección Cauce.",
  openGraph: {
    type: "website", locale: "es_AR", title: "Cauce · Objetos para vivir",
    description: "Objetos con intención, texturas que se sienten y detalles que vuelven especial lo cotidiano.",
    images: ["/cauce/hero.webp"],
  },
  twitter: { card: "summary", title: "Cauce · Objetos para vivir", description: "Objetos con intención para tu casa." },
};

export const viewport: Viewport = { themeColor: "#f7f5ef", colorScheme: "light" };

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  return <CauceCartProvider products={await getCauceProducts()}><CauceHeader />{children}<CauceFooter /></CauceCartProvider>;
}
