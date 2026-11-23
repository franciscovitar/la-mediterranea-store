import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "../app/api/cauce/checkout/demo-status/route";

test("Cauce test checkout status is hidden outside the isolated site", async () => {
  const original = process.env.CAUCE_STANDALONE_SITE;
  try {
    delete process.env.CAUCE_STANDALONE_SITE;
    const response = await GET();
    assert.equal(response.status, 404);
    assert.equal(response.headers.get("cache-control"), "no-store");
  } finally {
    if (original === undefined) delete process.env.CAUCE_STANDALONE_SITE;
    else process.env.CAUCE_STANDALONE_SITE = original;
  }
});

test("status reveals only sanitized test configuration, not credentials or provider confirmation", async () => {
  const vars = ["CAUCE_STANDALONE_SITE", "CAUCE_CHECKOUT_ENABLED", "CAUCE_CATALOG_SOURCE", "CAUCE_SUPABASE_SECRET_KEY",
    "CAUCE_MERCADOPAGO_TEST_ACCESS_TOKEN", "CAUCE_MERCADOPAGO_TEST_SELLER_ID",
    "CAUCE_MERCADOPAGO_WEBHOOK_SECRET", "VERCEL_AUTOMATION_BYPASS_SECRET", "CAUCE_CHECKOUT_ORIGIN"] as const;
  const saved = Object.fromEntries(vars.map(k => [k, process.env[k]]));
  try {
    Object.assign(process.env, {
      CAUCE_STANDALONE_SITE: "true", CAUCE_CHECKOUT_ENABLED: "true", CAUCE_CATALOG_SOURCE: "database",
      CAUCE_SUPABASE_SECRET_KEY: "synthetic-db-key", CAUCE_MERCADOPAGO_TEST_ACCESS_TOKEN: "APP_USR-synthetictesttoken123456",
      CAUCE_MERCADOPAGO_TEST_SELLER_ID: "1765413554", CAUCE_MERCADOPAGO_WEBHOOK_SECRET: "synthetic-webhook-signing-secret",
      VERCEL_AUTOMATION_BYPASS_SECRET: "synthetic-test-automation-bypass-secret",
      CAUCE_CHECKOUT_ORIGIN: "https://cauce-portfolio-demo.vercel.app",
    });
    const response = await GET();
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body, { provider: "mercadopago", mode: "test-only", configured: true });
    assert.equal(response.headers.get("cache-control"), "no-store");
    const json = JSON.stringify(body);
    for (const secret of ["synthetic-db-key", "APP_USR-", "automation-bypass", "1765413554"]) {
      assert.equal(json.includes(secret), false);
    }
  } finally {
    for (const key of vars) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
});
