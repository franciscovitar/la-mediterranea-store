import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "La Mediterránea · Tienda oficial",
  description: "Merchandising oficial de la Orquesta-Escuela Mediterránea.",
};

export const viewport: Viewport = {
  themeColor: "#fbf5ea",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
