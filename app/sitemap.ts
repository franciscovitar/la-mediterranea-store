import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return [];

  try {
    const url = new URL(raw);
    return [{
      url: url.toString().replace(/\/$/, ""),
      changeFrequency: "weekly",
      priority: 1,
    }];
  } catch {
    return [];
  }
}
