import assert from "node:assert/strict";
import test from "node:test";
import { HttpRequestError, readJsonBody } from "../lib/http/request";

test("readJsonBody parses JSON requests", async () => {
  const request = new Request("http://localhost/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true }),
  });
  const body = await readJsonBody<{ ok: boolean }>(request);
  assert.equal(body.ok, true);
});

test("readJsonBody rejects non-json content", async () => {
  const request = new Request("http://localhost/api", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: "hello",
  });
  await assert.rejects(() => readJsonBody(request), (error: unknown) =>
    error instanceof HttpRequestError && error.status === 415
  );
});

test("readJsonBody rejects oversized payloads", async () => {
  const request = new Request("http://localhost/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value: "x".repeat(200) }),
  });
  await assert.rejects(() => readJsonBody(request, 32), (error: unknown) =>
    error instanceof HttpRequestError && error.status === 413
  );
});
