import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "./cauce.css";

const bodyFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: {
    default: "Cauce · Objetos para vivir",
    template: "%s · Cauce",
  },
  description: "Objetos de hogar, mesa y decoración para acompañar tus rituales cotidianos. Conocé la colección Cauce.",
  openGraph: {
    type: "website",
    locale: "es_AR",
    title: "Cauce · Objetos para vivir",
    description: "Objetos con intención, texturas que se sienten y detalles que vuelven especial lo cotidiano.",
    images: ["/cauce/hero.webp"],
  },
  twitter: {
    card: "summary",
    title: "Cauce · Objetos para vivir",
    description: "Objetos con intención para tu casa.",
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f5ef",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={bodyFont.variable}>{children}</body>
    </html>
  );
}
