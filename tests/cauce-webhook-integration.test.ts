import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { POST as webhook } from "../app/api/cauce/checkout/webhook/route";

const origin = "https://cauce-retail-preview-genova.vercel.app";
const orderId = "123e4567-e89b-42d3-a456-426614174001";
const paymentId = "191136243454";
const sellerId = "1765413554";
const secret = "synthetic-cauce-webhook-secret";
const requestId = "synthetic-request-id-1";

const runtime = {
  NEXT_PUBLIC_CAUCE_SUPABASE_URL: "https://cauce-isolated.supabase.co",
  NEXT_PUBLIC_CAUCE_SUPABASE_PUBLISHABLE_KEY: "synthetic-publishable-key",
  CAUCE_CATALOG_SOURCE: "database",
  CAUCE_CHECKOUT_ENABLED: "false",
  CAUCE_SUPABASE_SECRET_KEY: "synthetic-service-role-key",
  CAUCE_MERCADOPAGO_TEST_ACCESS_TOKEN: "APP_USR-synthetic-test-token",
  CAUCE_MERCADOPAGO_TEST_SELLER_ID: sellerId,
  CAUCE_MERCADOPAGO_WEBHOOK_SECRET: secret,
  VERCEL_AUTOMATION_BYPASS_SECRET: "synthetic-preview-bypass-key-123",
  CAUCE_CHECKOUT_ORIGIN: origin,
};

const storedOrder = {
  id: orderId, request_key: "123e4567-e89b-42d3-a456-426614174002",
  total_amount: 28500, status: "pending", currency: "ARS",
  preference_id: "synthetic-preference-123", expires_at: "2099-01-01T00:00:00Z",
};

function signedRequest(options: { status?: string; ts?: number; signature?: string } = {}) {
  const ts = String(options.ts ?? Math.floor(Date.now() / 1000));
  const manifest = `id:${paymentId};request-id:${requestId};ts:${ts};`;
  const signature = options.signature ?? `ts=${ts},v1=${createHmac("sha256", secret).update(manifest).digest("hex")}`;
  return new Request(`${origin}/api/cauce/checkout/webhook?type=payment&data.id=${paymentId}`, {
    method: "POST", body: JSON.stringify({ type: "payment", data: { id: paymentId } }),
    headers: { "Content-Type": "application/json", "x-request-id": requestId, "x-signature": signature },
  });
}

async function withSandbox(status: "approved" | "pending" | "rejected", run: (
  invoke: (request: Request) => Promise<Response>,
  calls: { paths: string[]; rpcBodies: Array<Record<string, unknown>> },
) => Promise<void>, changes: { card?: Record<string, unknown> } = {}) {
  const before = Object.fromEntries(Object.keys(runtime).map((key) => [key, process.env[key]]));
  const fetchBefore = globalThis.fetch;
  const calls = { paths: [] as string[], rpcBodies: [] as Array<Record<string, unknown>> };
  try {
    Object.assign(process.env, runtime);
    globalThis.fetch = async (input, init) => {
      const path = String(input);
      calls.paths.push(path);
      if (path === "https://api.mercadolibre.com/users/me") {
        return Response.json({ id: Number(sellerId), tags: ["test_user"], site_id: "MLA" });
      }
      if (path === `https://api.mercadopago.com/v1/payments/${paymentId}`) {
        return Response.json({
          id: Number(paymentId), external_reference: orderId, collector_id: Number(sellerId),
          status, live_mode: true, transaction_amount: 28500, currency_id: "ARS",
          payment_method_id: "visa", card: changes.card ?? { first_six_digits: "450995", last_four_digits: "3704" },
        });
      }
      if (path.includes("/rest/v1/cauce_orders?")) return Response.json(storedOrder);
      if (path.includes("/rest/v1/rpc/cauce_checkout_apply_proven_test_payment")) {
        assert.equal(init?.method, "POST");
        calls.rpcBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
        return Response.json(status === "approved" ? "paid_test" : status === "rejected" ? "failed_test" : "pending");
      }
      throw new Error(`Unexpected Cauce integration request: ${path}`);
    };
    await run(webhook, calls);
  } finally {
    globalThis.fetch = fetchBefore;
    for (const [key, value] of Object.entries(before)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

for (const [providerStatus, expectedStatus] of [
  ["approved", "paid_test"], ["pending", "pending"], ["rejected", "failed_test"],
] as const) {
  test(`valid signed ${providerStatus} webhook verifies provider and forwards ${expectedStatus} to restricted RPC`, async () => {
    await withSandbox(providerStatus, async (invoke, calls) => {
      const response = await invoke(signedRequest());
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { received: true, status: expectedStatus });
      assert.equal(calls.paths.filter((path) => path.endsWith("/users/me")).length, 1);
      assert.equal(calls.paths.filter((path) => path.endsWith(`/v1/payments/${paymentId}`)).length, 1);
      assert.equal(calls.rpcBodies.length, 1);
      assert.deepEqual(calls.rpcBodies[0], {
        p_order_id: orderId, p_payment_id: paymentId,
        p_preference_id: storedOrder.preference_id, p_provider_status: providerStatus,
        p_amount: 28500, p_currency: "ARS", p_live_mode: true,
        p_test_seller_verified: true, p_test_card_verified: true,
      });
    });
  });
}

test("invalid and expired webhook signatures return 401 before any provider or DB access", async () => {
  await withSandbox("approved", async (invoke, calls) => {
    const wrong = await invoke(signedRequest({ signature: "ts=1700000000,v1=" + "0".repeat(64) }));
    assert.equal(wrong.status, 401);
    const old = await invoke(signedRequest({ ts: 1700000000 }));
    assert.equal(old.status, 401);
    assert.equal(calls.paths.length, 0);
    assert.equal(calls.rpcBodies.length, 0);
  });
});

test("signed payment with forged card fingerprint is rejected before stock RPC", async () => {
  await withSandbox("approved", async (invoke, calls) => {
    const response = await invoke(signedRequest());
    assert.equal(response.status, 422);
    assert.equal(calls.rpcBodies.length, 0);
  }, { card: { first_six_digits: "450995", last_four_digits: "9999" } });
});

test("an identical fresh signed notification can be replayed and delegates idempotency to transactional RPC", async () => {
  await withSandbox("approved", async (invoke, calls) => {
    const request = signedRequest();
    const signature = request.headers.get("x-signature");
    assert.equal((await invoke(request.clone())).status, 200);
    assert.equal((await invoke(request)).status, 200);
    assert.equal(calls.rpcBodies.length, 2);
    assert.equal(calls.rpcBodies[0].p_payment_id, calls.rpcBodies[1].p_payment_id);
    assert.ok(signature);
  });
});
