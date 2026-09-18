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
  const dailyBatch = await request("/api/trpc/challenges.getDaily,challenges.getDailyArchive?batch=1", {
    headers: { cookie: "app_session_id=invalid-session" },
  }, 200);
  const today = new Date().toISOString().slice(0, 10);
  const archive = dailyBatch[1].result.data.json;
  assert.equal(dailyBatch[0].result.data.json.challengeId, `daily-${today}`);
  assert.equal(archive.today, today);
  assert.equal(archive.challenges.length, Number(today.slice(8)));
  assert.equal(archive.challenges.at(-1).challengeId, `daily-${today.slice(0, 7)}-01`);
  assert.ok(archive.challenges.every(day => !('word' in day) && !('aliases' in day)));
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
  for (const [word, status] of [["agua", 200], ["céu", 200], ["correndo", 200], ["xqztrp", 400]]) {
    const guess = await request("/api/trpc/challenges.submitGuess?batch=1", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ 0: { json: { challengeId: "daily-2024-01-01", word } } }),
    }, status);
    if (status === 400) {
      assert.equal(guess[0].error.json.data.code, "BAD_REQUEST");
      assert.match(guess[0].error.json.message, /Palavra não reconhecida/);
    } else {
      assert.equal(guess[0].result.data.json.word, word);
    }
  }
  console.log("Production smoke check passed: offline Portuguese lexicon, native ESM entrypoint, JSON API responses, configuration guard, no Manus injection.");
} finally {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
