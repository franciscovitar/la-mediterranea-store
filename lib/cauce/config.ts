export function cauceDatabaseEnabled() {
  return process.env.CAUCE_CATALOG_SOURCE === "database";
}

export function cauceMerchantEnabled() {
  return cauceDatabaseEnabled() && process.env.CAUCE_MERCHANT_ENABLED === "true";
}

/** Never reuse the historic store's Mercado Pago or Supabase credentials. */
export function cauceSandboxCheckoutEnabled() {
  return cauceDatabaseEnabled() && process.env.CAUCE_CHECKOUT_ENABLED === "true" &&
    !!process.env.CAUCE_SUPABASE_SECRET_KEY &&
    !!process.env.CAUCE_MERCADOPAGO_TEST_ACCESS_TOKEN?.startsWith("TEST-") &&
    !!process.env.CAUCE_MERCADOPAGO_WEBHOOK_SECRET &&
    cauceCheckoutOrigin() !== null;
}

export function cauceCheckoutOrigin() {
  const value = process.env.CAUCE_CHECKOUT_ORIGIN;
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash ||
        url.pathname !== "/" || !url.hostname.endsWith(".vercel.app")) return null;
    return url.origin;
  } catch { return null; }
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
