import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";

// Exercise the actual deployment entrypoint with plain Node, without tsx/Vite
// or database access. Never load developer credentials during this check.
process.env.VERCEL = "1";
process.env.NODE_ENV = "production";
process.env.DATABASE_URL = "";
process.env.JWT_SECRET = "";

const html = await readFile(new URL("../dist/public/index.html", import.meta.url), "utf8");
assert.doesNotMatch(html, /debug-collector\.js|id="manus-runtime"/);
const { default: handler } = await import("../api/index.mjs");
const server = createServer(handler);
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;

async function request(path, options, status) {
  const response = await fetch(`${base}${path}`, options);
  assert.equal(response.status, status, path);
  assert.match(response.headers.get("content-type"), /application\/json/);
  return response.json();
}

try {
  const me = await request("/api/trpc/auth.me?batch=1", {}, 200);
  assert.equal(me[0].result.data.json, null);
  await request("/api/nonexistent", {}, 404);
  const invalid = await request("/api/trpc/auth.register?batch=1", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ 0: { json: {} } }),
  }, 400);
  assert.equal(invalid[0].error.json.data.code, "BAD_REQUEST");
  await request("/api/trpc/auth.register?batch=1", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{",
  }, 400);
  const unavailable = await request("/api/trpc/auth.register?batch=1", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ 0: { json: {
      username: "production_check", name: "Production check", password: "test-password-only",
    } } }),
  }, 500);
  assert.equal(unavailable[0].error.json.data.code, "INTERNAL_SERVER_ERROR");
  assert.match(unavailable[0].error.json.message, /configura/);
  console.log("Production smoke check passed: native ESM entrypoint, JSON API responses, configuration guard, no Manus injection.");
} finally {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
