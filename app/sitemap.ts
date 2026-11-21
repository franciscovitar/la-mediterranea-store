import type { MetadataRoute } from "next";
import { cauceProducts } from "@/lib/cauce/catalog";

export default function sitemap(): MetadataRoute.Sitemap {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return [];

  try {
    const url = new URL(raw);
    const origin = url.toString().replace(/\/$/, "");
    return [{
      url: origin,
      changeFrequency: "weekly",
      priority: 1,
    }, {
      url: `${origin}/catalogo`,
      changeFrequency: "weekly",
      priority: 0.9,
    }, ...cauceProducts.filter((product) => product.active).map((product) => ({
      url: `${origin}/producto/${product.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }))];
  } catch {
    return [];
  }
}
