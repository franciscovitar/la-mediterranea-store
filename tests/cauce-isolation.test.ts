import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { middleware } from "../middleware";
import { cauceStandaloneSiteEnabled } from "../lib/cauce/config";

const req = (path: string) => new NextRequest(new URL(path, "https://cauce.example.test"));
const rewritten = async (path: string) => (await middleware(req(path))).headers.get("x-middleware-rewrite") ?? "";

test("Cauce is inaccessible from the historical site unless explicitly opted in", async () => {
  const previous = process.env.CAUCE_STANDALONE_SITE;
  try {
    delete process.env.CAUCE_STANDALONE_SITE;
    assert.equal(cauceStandaloneSiteEnabled(), false);
    for (const path of ["/cauce", "/cauce/catalogo", "/cauce/pedido", "/gestion", "/api/cauce/catalog",
      "/api/cauce/checkout/create", "/api/cauce/checkout/webhook", "/auth/cauce/confirm"]) {
      assert.equal(new URL(await rewritten(path)).pathname, "/__cauce_not_found", path);
    }
  } finally {
    if (previous === undefined) delete process.env.CAUCE_STANDALONE_SITE;
    else process.env.CAUCE_STANDALONE_SITE = previous;
  }
});

test("Cauce-only Preview rewrites old links without touching historical payment handlers", async () => {
  const previous = process.env.CAUCE_STANDALONE_SITE;
  try {
    process.env.CAUCE_STANDALONE_SITE = "true";
    assert.equal(cauceStandaloneSiteEnabled(), true);
    for (const [from, to] of Object.entries({
      "/": "/cauce", "/catalogo": "/cauce/catalogo", "/producto/taza-bruma": "/cauce/producto/taza-bruma",
      "/favoritos": "/cauce/favoritos", "/pedido": "/cauce/pedido",
      "/pedido/resultado?order=abc&key=xyz": "/cauce/pedido/resultado?order=abc&key=xyz",
      "/api/catalog": "/api/cauce/catalog",
    })) {
      const response = new URL(await rewritten(from));
      assert.equal(response.pathname + response.search, to, from);
    }
    for (const path of ["/checkout", "/admin", "/api/checkout/create", "/api/webhooks/mercadopago"]) {
      const result = await middleware(req(path));
      if (path.startsWith("/api/")) assert.equal(result.status, 503, path);
      else assert.equal(new URL(result.headers.get("x-middleware-rewrite") ?? "").pathname, "/no-disponible", path);
    }
  } finally {
    if (previous === undefined) delete process.env.CAUCE_STANDALONE_SITE;
    else process.env.CAUCE_STANDALONE_SITE = previous;
  }
});
