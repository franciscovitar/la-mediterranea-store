import type { Metadata, Viewport } from "next";
import { Fredoka, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const bodyFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

const displayFont = Fredoka({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: {
    default: "La Mediterránea · Tienda oficial",
    template: "%s · La Mediterránea",
  },
  description: "Merchandising oficial de la Orquesta-Escuela Mediterránea.",
  openGraph: {
    type: "website",
    locale: "es_AR",
    title: "La Mediterránea · Tienda oficial",
    description: "Merchandising oficial de la Orquesta-Escuela Mediterránea.",
  },
  twitter: {
    card: "summary",
    title: "La Mediterránea · Tienda oficial",
    description: "Merchandising oficial de la Orquesta-Escuela Mediterránea.",
  },
};

export const viewport: Viewport = {
  themeColor: "#fbf5ea",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>{children}</body>
    </html>
  );
}
