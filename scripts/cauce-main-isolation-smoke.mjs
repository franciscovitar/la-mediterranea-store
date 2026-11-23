// Local verification that Cauce stays inaccessible on the historical deployment.
// No production database/payment credentials or remote deployment required.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const port = 31572;
const base = `http://127.0.0.1:${port}`;
const startCode = `require("node:os").networkInterfaces = () => ({lo:[{address:"127.0.0.1",family:"IPv4",internal:true}]});process.argv=["node","next","start","-p","${port}","-H","127.0.0.1"];require("next/dist/bin/next")`;
const env = { ...process.env, CAUCE_STANDALONE_SITE: "false" };
const server = spawn(process.execPath, ["-e", startCode], { cwd: process.cwd(), env, stdio: ["ignore", "pipe", "pipe"] });
let output = "";
server.stdout.on("data", (part) => { output += part.toString(); });
server.stderr.on("data", (part) => { output += part.toString(); });

try {
  const deadline = Date.now() + 30_000;
  while (!output.includes("Ready in") && !output.includes("Local:")) {
    if (server.exitCode !== null || Date.now() > deadline) throw new Error(`Next failed to start: ${output.slice(-1000)}`);
    await new Promise((done) => setTimeout(done, 250));
  }
  for (const path of ["/cauce", "/cauce/catalogo", "/cauce/pedido", "/gestion", "/api/cauce/catalog", "/api/cauce/checkout/create"]) {
    const response = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(5000) });
    assert.equal(response.status, 404, `Historical app exposed ${path}: ${response.status}`);
    console.log(`PASS 404 GET ${path}`);
  }
  // The historical checkout itself should still render the original brand;
  // this does not initiate an order or call Mercado Pago.
  const response = await fetch(`${base}/checkout`, { signal: AbortSignal.timeout(5000) });
  assert.equal(response.status, 200, "Historical checkout route changed");
  assert.match(await response.text(), /La Mediterránea/);
  console.log("PASS historical checkout page remains available");
} finally {
  server.kill("SIGTERM");
}
