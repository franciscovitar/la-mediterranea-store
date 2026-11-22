import assert from "node:assert/strict";
import test from "node:test";
import { POST as quote } from "../app/api/cauce/checkout/quote/route";
import { POST as create } from "../app/api/cauce/checkout/create/route";
import { POST as webhook } from "../app/api/cauce/checkout/webhook/route";
import { GET as status } from "../app/api/cauce/checkout/status/route";
import { cauceProducts } from "../lib/cauce/catalog";

const origin = "http://localhost:3000";
const validLines = [{ productId: cauceProducts[0].id, quantity: 2, price: 1 }];

function post(path: string, body: unknown, from = origin) {
  return new Request(`${origin}${path}`, { method: "POST", body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", Origin: from, Host: "localhost:3000" } });
}

test("Cauce quote ignores forged browser price and returns server price", async () => {
  const response = await quote(post("/api/cauce/checkout/quote", { lines: validLines }));
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.total, cauceProducts[0].price * 2);
  assert.equal(result.sandboxEnabled, false);
});

test("quote blocks forged origins and invalid line input", async () => {
  assert.equal((await quote(post("/api/cauce/checkout/quote", { lines: validLines }, "https://bad.invalid"))).status, 403);
  assert.equal((await quote(post("/api/cauce/checkout/quote", { lines: [] }))).status, 400);
});

test("creation and webhook fail closed before credentials exist", async () => {
  const response = await create(post("/api/cauce/checkout/create", {
    lines: validLines, requestKey: "123e4567-e89b-42d3-a456-426614174000",
  }));
  assert.equal(response.status, 503);
  assert.equal((await webhook(post("/api/cauce/checkout/webhook?type=payment&data.id=1234", {}))).status, 503);
});

test("status requires an unguessable pair of UUIDs", async () => {
  const response = await status(new Request(`${origin}/api/cauce/checkout/status?order=not-valid&key=nope`));
  assert.equal(response.status, 400);
});
