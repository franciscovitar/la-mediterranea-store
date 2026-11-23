// Optional local black-box QA, outside metered deployment/CI infrastructure.
// Run after `npm run build`: node scripts/cauce-smoke.mjs
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const port = 31571;
const base = `http://127.0.0.1:${port}`;
const screenshotDir = process.env.CAUCE_QA_DIR;

if (process.env.CAUCE_STANDALONE_SITE !== "true") {
  throw new Error("Cauce smoke requires CAUCE_STANDALONE_SITE=true; historical storefront is the default.");
}

// Some restricted CI-like workspaces disable OS network-interface enumeration.
// This changes Next's local logging only, not any application networking behavior.
const startCode = `require("node:os").networkInterfaces = () => ({lo:[{address:"127.0.0.1",family:"IPv4",internal:true}]});process.argv=["node","next","start","-p","${port}","-H","127.0.0.1"];require("next/dist/bin/next")`;
const server = spawn(process.execPath, ["-e", startCode], { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] });
let output = "";
server.stdout.on("data", (chunk) => { output += chunk.toString(); });
server.stderr.on("data", (chunk) => { output += chunk.toString(); });

async function waitForServer() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Next exited early: ${output}`);
    try {
      const response = await fetch(base, { signal: AbortSignal.timeout(2000) });
      if (response.ok) return;
    } catch { /* Starting */ }
    await new Promise((done) => setTimeout(done, 350));
  }
  throw new Error(`Timed out starting Next: ${output}`);
}

async function probe(path, expected, method = "GET", options = {}) {
  const response = await fetch(base + path, { method, signal: AbortSignal.timeout(8000), ...options });
  assert.equal(response.status, expected, `${method} ${path} returned ${response.status}`);
  console.log(`PASS ${response.status} ${method} ${path}`);
  return response;
}

try {
  await waitForServer();
  const home = await (await probe("/", 200)).text();
  assert.match(home, /Hacé espacio/);
  assert.doesNotMatch(home, /La Mediterránea|Orquesta-Escuela/);
  await probe("/catalogo", 200);
  await probe("/cauce", 200);
  await probe("/cauce/catalogo", 200);
  await probe("/catalogo?categoria=Mesa&q=taza", 200);
  await probe("/producto/taza-bruma", 200);
  await probe("/favoritos", 200);
  await probe("/pedido", 200);
  await probe("/pedido/resultado", 200);
  await probe("/producto/no-existe", 404);
  const json = await (await probe("/api/catalog", 200)).json();
  assert.equal(json.products.length, 12);
  const cauceApi = await (await probe("/api/cauce/catalog", 200)).json();
  assert.equal(cauceApi.products.length, 12);
  await probe("/checkout", 200); // Historical checkout is unavailable on isolated Cauce Preview.
  await probe("/api/checkout/create", 503, "POST");
  await probe("/api/admin/orders", 503);
  await probe("/api/webhooks/mercadopago", 503, "POST");
  await probe("/admin", 200); // Rewritten to the non-transactional unavailable page.
  await probe("/gestion", 404); // No isolated Cauce database configured.
  await probe("/api/cauce/merchant", 503); // Merchant auth is fail-closed.
  await probe("/api/cauce/merchant/products", 403, "POST"); // Missing Origin/JSON.
  await probe("/api/cauce/merchant/products", 503, "POST", {
    headers: { origin: base, "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  const quote = await probe("/api/cauce/checkout/quote", 200, "POST", {
    headers: { origin: base, "content-type": "application/json" },
    body: JSON.stringify({ lines: [{ productId: "taza-bruma", quantity: 2, price: 1 }] }),
  });
  const quotation = await quote.json();
  assert.equal(quotation.total, 65000, "Cauce must use server-side price, not forged price");
  assert.equal(quotation.sandboxEnabled, false, "Test payment remains disabled without credentials");
  await probe("/api/cauce/checkout/create", 503, "POST", {
    headers: { origin: base, "content-type": "application/json" },
    body: JSON.stringify({ lines: [{ productId: "taza-bruma", quantity: 1 }], requestKey: "123e4567-e89b-42d3-a456-426614174000" }),
  });
  await probe("/api/cauce/checkout/webhook?type=payment&data.id=1234", 503, "POST");
  await probe("/api/cauce/checkout/quote", 403, "POST", {
    headers: { origin: "https://forged.invalid", "content-type": "application/json" },
    body: JSON.stringify({ lines: [{ productId: "taza-bruma", quantity: 1 }] }),
  });

  if (screenshotDir) {
    mkdirSync(screenshotDir, { recursive: true });
    for (const shot of [
      { name: "home-desktop", path: "/", size: "1440,1000" },
      { name: "catalog-desktop", path: "/catalogo", size: "1440,1000" },
      { name: "product-desktop", path: "/producto/taza-bruma", size: "1440,1000" },
      { name: "home-mobile", path: "/", size: "390,844" },
      { name: "order-review-mobile", path: "/pedido", size: "390,844" },
    ]) {
      const file = resolve(screenshotDir, `${shot.name}.png`);
      const result = spawnSync("/usr/bin/chromium", ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--hide-scrollbars", `--window-size=${shot.size}`, "--virtual-time-budget=1200", `--screenshot=${file}`, base + shot.path], { encoding: "utf8", timeout: 20000 });
      assert.equal(result.status, 0, `Chromium failed: ${result.stderr?.slice(-900)}`);
      console.log(`SCREENSHOT ${file}`);
    }
  }
} finally {
  server.kill("SIGTERM");
}
