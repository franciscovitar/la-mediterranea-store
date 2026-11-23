export function cauceDatabaseEnabled() {
  return process.env.CAUCE_CATALOG_SOURCE === "database";
}

/** Only the dedicated Cauce Preview opts in; the historical production app stays intact. */
export function cauceStandaloneSiteEnabled() {
  return process.env.CAUCE_STANDALONE_SITE === "true";
}

export function cauceMerchantEnabled() {
  return cauceDatabaseEnabled() && process.env.CAUCE_MERCHANT_ENABLED === "true";
}

/** Keep processing signed test notifications for orders started before checkout is paused. */
export function cauceSandboxPaymentProcessingConfigured() {
  return cauceDatabaseEnabled() &&
    !!process.env.CAUCE_SUPABASE_SECRET_KEY &&
    /^APP_USR-[A-Za-z0-9_-]{12,}$/.test(process.env.CAUCE_MERCADOPAGO_TEST_ACCESS_TOKEN ?? "") &&
    /^\d{5,20}$/.test(process.env.CAUCE_MERCADOPAGO_TEST_SELLER_ID ?? "") &&
    !!process.env.CAUCE_MERCADOPAGO_WEBHOOK_SECRET &&
    /^[A-Za-z0-9_-]{20,200}$/.test(process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? "") &&
    cauceCheckoutOrigin() !== null;
}

/** Never reuse the historic store's Mercado Pago or Supabase credentials. */
export function cauceSandboxCheckoutEnabled() {
  return process.env.CAUCE_CHECKOUT_ENABLED === "true" && cauceSandboxPaymentProcessingConfigured();
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
