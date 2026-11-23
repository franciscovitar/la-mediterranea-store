import assert from "node:assert/strict";
import test from "node:test";
import { CauceCheckoutError } from "../lib/cauce/checkout";
import { cauceReservationRateLimitHashes, enforceCauceReservationRateLimit } from "../lib/cauce/rate-limit";

const requestKey = "123e4567-e89b-42d3-a456-426614174091";
const secret = "synthetic-cauce-service-role-key";

test("rate-limit digest is deterministic and does not expose client IP or request key", () => {
  const first = cauceReservationRateLimitHashes("203.0.113.7", requestKey, secret);
  const repeat = cauceReservationRateLimitHashes("203.0.113.7", requestKey, secret);
  assert.deepEqual(first, repeat);
  assert.notEqual(first.clientHash, "203.0.113.7");
  assert.notEqual(first.requestHash, requestKey);
  assert.notEqual(first.clientHash, cauceReservationRateLimitHashes("203.0.113.8", requestKey, secret).clientHash);
});

test("rate limit fails closed without a trusted IP, a valid key or a server secret", () => {
  for (const [ip, key, hmacKey] of [
    [null, requestKey, secret],
    ["198.51.100.1, 203.0.113.1", requestKey, secret],
    ["203.0.113.1", "bad-key", secret],
    ["203.0.113.1", requestKey, "short"],
  ] as const) {
    assert.throws(() => cauceReservationRateLimitHashes(ip, key, hmacKey),
      (error: unknown) => error instanceof CauceCheckoutError && error.status === 503);
  }
});

async function withRateLimitResponse(data: unknown, run: (calls: Array<{ url: string; body: Record<string, unknown> }>) => Promise<void>) {
  const envKeys = [
    "NEXT_PUBLIC_CAUCE_SUPABASE_URL", "NEXT_PUBLIC_CAUCE_SUPABASE_PUBLISHABLE_KEY",
    "CAUCE_CATALOG_SOURCE", "CAUCE_SUPABASE_SECRET_KEY", "CAUCE_MERCADOPAGO_TEST_ACCESS_TOKEN",
    "CAUCE_MERCADOPAGO_TEST_SELLER_ID", "CAUCE_MERCADOPAGO_WEBHOOK_SECRET",
    "VERCEL_AUTOMATION_BYPASS_SECRET", "CAUCE_CHECKOUT_ORIGIN",
  ];
  const before = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  try {
    Object.assign(process.env, {
      NEXT_PUBLIC_CAUCE_SUPABASE_URL: "https://cauce-isolated.supabase.co",
      NEXT_PUBLIC_CAUCE_SUPABASE_PUBLISHABLE_KEY: "synthetic-publishable-key",
      CAUCE_CATALOG_SOURCE: "database",
      CAUCE_SUPABASE_SECRET_KEY: secret,
      CAUCE_MERCADOPAGO_TEST_ACCESS_TOKEN: "APP_USR-synthetic-test-token",
      CAUCE_MERCADOPAGO_TEST_SELLER_ID: "1765413554",
      CAUCE_MERCADOPAGO_WEBHOOK_SECRET: "synthetic-webhook-secret",
      VERCEL_AUTOMATION_BYPASS_SECRET: "synthetic-preview-bypass-key-123",
      CAUCE_CHECKOUT_ORIGIN: "https://cauce-retail-preview-genova.vercel.app",
    });
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      calls.push({ url, body: JSON.parse(String(init?.body)) as Record<string, unknown> });
      return Response.json(data);
    };
    await run(calls);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(before)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("reservation limiter sends only HMAC values to the isolated database RPC", async () => {
  await withRateLimitResponse(true, async (calls) => {
    await enforceCauceReservationRateLimit(new Request("https://cauce.test/api/cauce/checkout/create", {
      headers: { "x-vercel-forwarded-for": "203.0.113.7" },
    }), requestKey);
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /rpc\/cauce_reservation_rate_limit$/);
    assert.equal(calls[0].body.p_max_attempts, 5);
    assert.equal(calls[0].body.p_window_seconds, 600);
    assert.notEqual(calls[0].body.p_client_hash, "203.0.113.7");
    assert.notEqual(calls[0].body.p_request_hash, requestKey);
  });
});

test("reservation limiter returns 429 when the persistent quota is full", async () => {
  await withRateLimitResponse(false, async () => {
    await assert.rejects(() => enforceCauceReservationRateLimit(new Request("https://cauce.test", {
      headers: { "x-vercel-forwarded-for": "203.0.113.7" },
    }), requestKey), (error: unknown) => error instanceof CauceCheckoutError && error.status === 429);
  });
});

test("reservation limiter fails closed when the database RPC errors", async () => {
  await withRateLimitResponse(null, async () => {
    globalThis.fetch = async () => Response.json({ message: "db down" }, { status: 500 });
    await assert.rejects(() => enforceCauceReservationRateLimit(new Request("https://cauce.test", {
      headers: { "x-vercel-forwarded-for": "203.0.113.7" },
    }), requestKey), (error: unknown) => error instanceof CauceCheckoutError && error.status === 503);
  });
});
