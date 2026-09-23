import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";

const port = 3210;
const origin = "http://127.0.0.1:" + port;

const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", String(port)], {
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: "",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
    SUPABASE_URL: "",
    SUPABASE_SECRET_KEY: "",
    MERCADOPAGO_ACCESS_TOKEN: "",
    MERCADOPAGO_WEBHOOK_SECRET: "",
    RESEND_API_KEY: "",
    ORDER_EMAIL_FROM: "",
    ORDER_NOTIFICATION_EMAIL: "",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let output = "";
child.stdout.on("data", (chunk) => { output += chunk.toString(); });
child.stderr.on("data", (chunk) => { output += chunk.toString(); });

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(origin + "/api/health");
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Next.js no arrancó a tiempo.\n" + output.slice(-3000));
}

async function json(path, init) {
  const response = await fetch(origin + path, init);
  const body = await response.json();
  return { response, body };
}

async function stopServer() {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    once(child, "exit"),
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ]);
  if (child.exitCode === null) {
    child.kill("SIGKILL");
    await once(child, "exit").catch(() => undefined);
  }
}

try {
  await waitForServer();

  const home = await fetch(origin + "/");
  assert.equal(home.status, 200);
  const homeHtml = await home.text();
  assert.match(homeHtml, /La Mediterránea/);
  assert.match(homeHtml, /Encontrá el tuyo/);

  const catalog = await json("/api/catalog");
  assert.equal(catalog.response.status, 200);
  assert.equal(catalog.body.products.length, 14);

  const quote = await json("/api/checkout/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lines: [{ productId: "botella", quantity: 2 }] }),
  });
  assert.equal(quote.response.status, 200);
  assert.equal(quote.body.total, 44000);

  const checkout = await fetch(origin + "/checkout");
  assert.equal(checkout.status, 200);
  assert.match(await checkout.text(), /Revisá tu pedido/);

  const readiness = await json("/api/integrations/readiness");
  assert.equal(readiness.response.status, 200);
  assert.equal(readiness.body.checkoutReady, false);

  const guardedCreate = await json("/api/checkout/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requestId: "123e4567-e89b-42d3-a456-426614174000",
      buyerName: "María José Pérez",
      buyerPhone: "3515551234",
      fulfillmentMethod: "pickup",
      lines: [{ productId: "botella", quantity: 1 }],
    }),
  });
  assert.equal(guardedCreate.response.status, 503);

  console.log("critical journey smoke: PASS");
} finally {
  await stopServer();
}
