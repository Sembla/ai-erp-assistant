import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { generateEvidence } from "../scripts/generate-evidence.mjs";

test("generates passing evaluation, privacy and API evidence", async () => {
  const output = await mkdtemp(join(tmpdir(), "ai-erp-evidence-"));
  const metrics = await generateEvidence(output);
  assert.equal(metrics.fixturesPassed, 30);
  assert.equal(metrics.fixturesTotal, 30);
  assert.equal(metrics.privacyPassed, metrics.privacyTotal);
  assert.equal(metrics.apiPassed, metrics.apiTotal);

  const evaluation = JSON.parse(await readFile(join(output, "evaluation-report.json"), "utf8"));
  const privacy = JSON.parse(await readFile(join(output, "privacy-report.json"), "utf8"));
  assert.equal(evaluation.dataSource, "synthetic");
  assert.equal(evaluation.failed, 0);
  assert.equal(privacy.boundary, "aggregate-only");
  assert.equal(privacy.failed, 0);
});

test("generates deterministic evidence artifacts", async () => {
  const first = await mkdtemp(join(tmpdir(), "ai-erp-evidence-a-"));
  const second = await mkdtemp(join(tmpdir(), "ai-erp-evidence-b-"));
  await generateEvidence(first);
  await generateEvidence(second);

  for (const filename of [
    "evaluation-report.json",
    "privacy-report.json",
    "api-examples.json",
    "evidence-summary.svg"
  ]) {
    assert.deepEqual(await readFile(join(first, filename)), await readFile(join(second, filename)));
  }
});
