import assert from "node:assert/strict";
import test from "node:test";
import type { AddressInfo } from "node:net";
import { createAppServer } from "../src/server.ts";

test("serves health, summary and local assistant endpoints", async (t) => {
  const server = createAppServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const page = await fetch(baseUrl);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /AI ERP Assistant/);

  const health = await fetch(`${baseUrl}/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: "ok", dataSource: "synthetic" });

  const summary = await fetch(`${baseUrl}/api/summary`);
  assert.equal(summary.status, 200);
  const summaryBody = await summary.json();
  assert.equal(summaryBody.data.delayedOrders.length, 2);

  const answer = await fetch(`${baseUrl}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "Qual cliente tem maior volume?", mode: "local" })
  });
  assert.equal(answer.status, 200);
  const answerBody = await answer.json();
  assert.equal(answerBody.data.intent, "top_customer");
  assert.match(answerBody.data.answer, /Cliente Atlas/);
});

test("rejects invalid questions and unknown routes", async (t) => {
  const server = createAppServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const invalid = await fetch(`${baseUrl}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "" })
  });
  assert.equal(invalid.status, 400);

  const missing = await fetch(`${baseUrl}/not-found`);
  assert.equal(missing.status, 404);
});

test("falls back to local mode when LLM configuration is absent", async (t) => {
  const previousKey = process.env.OPENAI_API_KEY;
  const previousModel = process.env.OPENAI_MODEL;
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_MODEL;
  t.after(() => {
    if (previousKey) process.env.OPENAI_API_KEY = previousKey;
    if (previousModel) process.env.OPENAI_MODEL = previousModel;
  });

  const server = createAppServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const port = (server.address() as AddressInfo).port;

  const response = await fetch(`http://127.0.0.1:${port}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "Faça um resumo", mode: "llm" })
  });
  const body = await response.json();
  assert.equal(body.data.mode, "local");
  assert.match(body.data.warning, /required for LLM mode/);
});
