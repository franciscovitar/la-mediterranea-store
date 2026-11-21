export function cauceDatabaseEnabled() {
  return process.env.CAUCE_CATALOG_SOURCE === "database";
}

export function cauceMerchantEnabled() {
  return cauceDatabaseEnabled() && process.env.CAUCE_MERCHANT_ENABLED === "true";
}

export function caucePublicConfig() {
  const url = process.env.NEXT_PUBLIC_CAUCE_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_CAUCE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) {
    throw new Error("Falta configurar un proyecto Supabase exclusivo para Cauce.");
  }
  if (url === process.env.NEXT_PUBLIC_SUPABASE_URL || url === process.env.SUPABASE_URL) {
    throw new Error("Cauce no puede reutilizar la base histórica de La Mediterránea.");
  }
  return { url, key };
}
