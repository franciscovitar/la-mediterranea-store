function env(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export type IntegrationReadiness = {
  supabaseServer: boolean;
  supabasePublic: boolean;
  mercadoPagoApi: boolean;
  mercadoPagoWebhook: boolean;
  siteUrl: boolean;
  checkoutReady: boolean;
  productionReady: boolean;
  missingForCheckout: string[];
  missingForProduction: string[];
};

export function getIntegrationReadiness(): IntegrationReadiness {
  const supabaseServer = Boolean(env("SUPABASE_URL") && env("SUPABASE_SECRET_KEY"));
  const supabasePublic = Boolean(env("NEXT_PUBLIC_SUPABASE_URL") && env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"));
  const mercadoPagoApi = Boolean(env("MERCADOPAGO_ACCESS_TOKEN"));
  const mercadoPagoWebhook = Boolean(env("MERCADOPAGO_WEBHOOK_SECRET"));
  const siteUrl = Boolean(env("NEXT_PUBLIC_SITE_URL"));

  const missingForCheckout = [
    !supabaseServer ? "Supabase server" : null,
    !mercadoPagoApi ? "Mercado Pago access token" : null,
    !siteUrl ? "NEXT_PUBLIC_SITE_URL" : null,
  ].filter((value): value is string => Boolean(value));

  const missingForProduction = [
    ...missingForCheckout,
    !supabasePublic ? "Supabase publishable key" : null,
    !mercadoPagoWebhook ? "Mercado Pago webhook secret" : null,
  ].filter((value): value is string => Boolean(value));

  return {
    supabaseServer,
    supabasePublic,
    mercadoPagoApi,
    mercadoPagoWebhook,
    siteUrl,
    checkoutReady: missingForCheckout.length === 0,
    productionReady: missingForProduction.length === 0,
    missingForCheckout,
    missingForProduction,
  };
}

export function getSupabaseServerConfig() {
  const url = env("SUPABASE_URL");
  const secretKey = env("SUPABASE_SECRET_KEY");
  if (!url || !secretKey) throw new Error("Supabase no está configurado en el servidor.");
  return { url: url.replace(/\/$/, ""), secretKey };
}

export function getMercadoPagoConfig() {
  const accessToken = env("MERCADOPAGO_ACCESS_TOKEN");
  const webhookSecret = env("MERCADOPAGO_WEBHOOK_SECRET");
  const siteUrl = env("NEXT_PUBLIC_SITE_URL");
  if (!accessToken) throw new Error("Mercado Pago no tiene Access Token configurado.");
  return {
    accessToken,
    webhookSecret,
    siteUrl: siteUrl?.replace(/\/$/, ""),
  };
}
