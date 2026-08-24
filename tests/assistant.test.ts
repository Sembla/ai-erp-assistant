import assert from "node:assert/strict";
import test from "node:test";
import { orders, inventory, productionJobs } from "../src/data/demoData.ts";
import { buildOperationalSnapshot } from "../src/services/analytics.ts";
import { answerLocally } from "../src/services/assistant.ts";

const snapshot = buildOperationalSnapshot(orders, inventory, productionJobs, "2026-08-24");
const now = "2026-08-24T12:00:00.000Z";

test("answers delayed-order questions", () => {
  const result = answerLocally("Quais pedidos estão atrasados?", snapshot, now);
  assert.equal(result.intent, "delayed_orders");
  assert.match(result.answer, /PED-1001/);
  assert.match(result.answer, /PED-1004/);
});

test("answers inventory questions without an LLM", () => {
  const result = answerLocally("Como está o estoque?", snapshot, now);
  assert.equal(result.mode, "local");
  assert.equal(result.intent, "inventory_risk");
  assert.match(result.answer, /Painel MDF branco/);
});

test("handles accents when classifying intent", () => {
  const result = answerLocally("Existe risco na produção?", snapshot, now);
  assert.equal(result.intent, "production_risk");
});

test("returns a useful default summary", () => {
  const result = answerLocally("O que devo observar hoje?", snapshot, now);
  assert.equal(result.intent, "operational_summary");
  assert.match(result.answer, /3 pedido\(s\) aberto\(s\)/);
});

test("rejects empty and oversized questions", () => {
  assert.throws(() => answerLocally("", snapshot, now), /between 1 and 500/);
  assert.throws(() => answerLocally("x".repeat(501), snapshot, now), /between 1 and 500/);
});
