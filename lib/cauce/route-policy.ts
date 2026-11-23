/**
 * The historical checkout/admin/auth endpoints stay unavailable in Cauce.
 * Only the new Cauce PKCE callback can pass through to the merchant session.
 */
export function isLegacyUnavailablePath(path: string) {
  return path === "/api/checkout" || path.startsWith("/api/checkout/") || path === "/api/admin" || path.startsWith("/api/admin/") ||
    path.startsWith("/api/webhooks/mercadopago") || path.startsWith("/api/integrations/") ||
    path === "/admin" || path.startsWith("/admin/") || path === "/checkout" || path.startsWith("/checkout/") ||
    (path.startsWith("/auth/") && path !== "/auth/cauce/confirm");
}
