import assert from "node:assert/strict";
import test from "node:test";
import { isLegacyUnavailablePath } from "../lib/cauce/route-policy";

test("Cauce PKCE callback is reachable without reopening old auth endpoints", () => {
  assert.equal(isLegacyUnavailablePath("/auth/cauce/confirm"), false);
  assert.equal(isLegacyUnavailablePath("/gestion"), false);
  assert.equal(isLegacyUnavailablePath("/api/cauce/merchant/products"), false);
  assert.equal(isLegacyUnavailablePath("/pedido"), false);
  assert.equal(isLegacyUnavailablePath("/pedido/resultado"), false);
  assert.equal(isLegacyUnavailablePath("/api/cauce/checkout/quote"), false);
  assert.equal(isLegacyUnavailablePath("/api/cauce/checkout/create"), false);
  assert.equal(isLegacyUnavailablePath("/api/cauce/checkout/webhook"), false);
  for (const path of [
    "/auth/confirm", "/auth/cauce/other", "/auth/login", "/admin",
    "/admin/products", "/checkout/start", "/api/checkout/create",
    "/api/admin/products", "/api/webhooks/mercadopago", "/api/integrations/order",
  ]) {
    assert.equal(isLegacyUnavailablePath(path), true, `${path} must remain unavailable`);
  }
});
