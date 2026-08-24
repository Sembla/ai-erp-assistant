import assert from "node:assert/strict";
import test from "node:test";
import { orders, inventory, productionJobs } from "../src/data/demoData.ts";
import { buildOperationalSnapshot, toLlmContext } from "../src/services/analytics.ts";

const snapshot = buildOperationalSnapshot(orders, inventory, productionJobs, "2026-08-24");

test("calculates the deterministic operational snapshot", () => {
  assert.equal(snapshot.totalOrders, 5);
  assert.equal(snapshot.openOrders, 3);
  assert.deepEqual(snapshot.delayedOrders.map((order) => order.id), ["PED-1001", "PED-1004"]);
  assert.equal(snapshot.delayedOrderValue, 30_400);
  assert.equal(snapshot.lowStockItems.length, 2);
  assert.equal(snapshot.productionRisks.length, 2);
});

test("ranks customers by order value", () => {
  assert.equal(snapshot.customerVolumes[0].customer, "Cliente Atlas");
  assert.equal(snapshot.customerVolumes[0].orderValue, 30_400);
});

test("creates an aggregate-only LLM context", () => {
  const context = toLlmContext(snapshot);
  assert.equal(context.metrics.delayedOrders, 2);
  assert.equal("delayedOrders" in context && Array.isArray(context.delayedOrders), false);
  assert.equal(JSON.stringify(context).includes("PED-1001"), false);
});

test("rejects invalid dates", () => {
  assert.throws(
    () => buildOperationalSnapshot(orders, inventory, productionJobs, "not-a-date"),
    /Invalid ISO date/
  );
});
