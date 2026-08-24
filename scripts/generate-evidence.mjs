import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { once } from "node:events";
import { orders, inventory, productionJobs } from "../src/data/demoData.ts";
import { buildOperationalSnapshot, toLlmContext } from "../src/services/analytics.ts";
import { answerLocally } from "../src/services/assistant.ts";
import { createAppServer } from "../src/server.ts";

const REFERENCE_DATE = "2026-08-24";
const FIXED_TIMESTAMP = "2026-08-24T12:00:00.000Z";
const DEFAULT_OUTPUT = resolve("docs/evidence");

const fixtures = [
  ["Quais pedidos estão atrasados?", "delayed_orders", ["PED-1001", "PED-1004", "R$ 30.400,00"]],
  ["Existem atrasos hoje?", "delayed_orders", ["2 pedido(s)", "PED-1001"]],
  ["Mostre os pedidos fora do prazo", "delayed_orders", ["PED-1004"]],
  ["Qual é o valor dos pedidos em atraso?", "delayed_orders", ["R$ 30.400,00"]],
  ["Há algum delay nos pedidos?", "delayed_orders", ["2 pedido(s)"]],
  ["Como está o estoque?", "inventory_risk", ["Painel MDF branco", "Corrediça telescópica"]],
  ["Quais materiais estão em falta?", "inventory_risk", ["2 item(ns)"]],
  ["Mostre o estoque crítico", "inventory_risk", ["18/20 chapas"]],
  ["Existe risco de stock?", "inventory_risk", ["24/24 pares"]],
  ["Quais itens atingiram o mínimo?", "inventory_risk", ["Painel MDF branco"]],
  ["Existe risco na produção?", "production_risk", ["OP-701", "OP-702"]],
  ["Como está a linha de produção?", "production_risk", ["72%", "41%"]],
  ["Quais ordens de produção exigem atenção?", "production_risk", ["2 ordem(ns)"]],
  ["Há problema na operação?", "production_risk", ["OP-701"]],
  ["Mostre os riscos de producao", "production_risk", ["OP-702"]],
  ["Qual cliente tem maior volume?", "top_customer", ["Cliente Atlas", "R$ 30.400,00"]],
  ["Quem é o maior cliente?", "top_customer", ["Cliente Atlas"]],
  ["Mostre o volume por cliente", "top_customer", ["2 pedido(s)"]],
  ["Qual cliente lidera a carteira?", "top_customer", ["Cliente Atlas"]],
  ["Cliente com maior valor", "top_customer", ["R$ 30.400,00"]],
  ["Qual o valor da carteira?", "order_value", ["R$ 59.900,00", "R$ 30.400,00"]],
  ["Quanto representa o faturamento simulado?", "order_value", ["R$ 59.900,00"]],
  ["Mostre o valor total dos pedidos", "order_value", ["R$ 59.900,00"]],
  ["Como está a carteira?", "order_value", ["R$ 30.400,00"]],
  ["Qual o valor associado aos atrasos?", "delayed_orders", ["R$ 30.400,00"]],
  ["Faça um resumo operacional", "operational_summary", ["3 pedido(s) aberto(s)", "2 em atraso"]],
  ["O que devo observar hoje?", "operational_summary", ["2 item(ns) com estoque crítico"]],
  ["Resumo do cenário", "operational_summary", ["2 risco(s) de produção"]],
  ["Situação geral", "operational_summary", [REFERENCE_DATE]],
  ["Visão executiva", "operational_summary", ["3 pedido(s) aberto(s)"]]
].map(([question, expectedIntent, requiredFacts]) => ({ question, expectedIntent, requiredFacts }));

function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildSummarySvg(metrics) {
  const cards = [
    ["Evaluation fixtures", `${metrics.fixturesPassed}/${metrics.fixturesTotal}`],
    ["Privacy checks", `${metrics.privacyPassed}/${metrics.privacyTotal}`],
    ["API checks", `${metrics.apiPassed}/${metrics.apiTotal}`],
    ["Data source", "Synthetic"]
  ];
  const cardSvg = cards.map(([label, value], index) => {
    const x = 64 + index * 330;
    return `<g transform="translate(${x} 310)">
      <rect width="290" height="168" rx="20" fill="#0b1a2e" stroke="#284460"/>
      <text x="24" y="52" fill="#8fb9df" font-size="20">${escapeXml(label)}</text>
      <text x="24" y="118" fill="#8cff27" font-size="46" font-weight="700">${escapeXml(value)}</text>
    </g>`;
  }).join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="640" viewBox="0 0 1440 640">
  <defs>
    <linearGradient id="bg" x1="0" x2="1"><stop stop-color="#061124"/><stop offset="0.62" stop-color="#071526"/><stop offset="1" stop-color="#10241c"/></linearGradient>
  </defs>
  <rect width="1440" height="640" fill="url(#bg)"/>
  <text x="64" y="74" fill="#8cff27" font-family="Arial, sans-serif" font-size="18" font-weight="700" letter-spacing="3">HENRIQUE SEMBLA · REPRODUCIBLE PORTFOLIO EVIDENCE</text>
  <text x="64" y="158" fill="#f3f7ff" font-family="Arial, sans-serif" font-size="58" font-weight="700">AI ERP Assistant</text>
  <text x="64" y="210" fill="#9fc5e8" font-family="Arial, sans-serif" font-size="25">Deterministic operational analysis · aggregate-only LLM boundary · read-only public demo</text>
  <text x="64" y="254" fill="#6e91b2" font-family="Arial, sans-serif" font-size="18">Reference date ${REFERENCE_DATE} · fictional records · no production ERP connection</text>
  ${cardSvg}
  <text x="64" y="556" fill="#f3f7ff" font-family="Arial, sans-serif" font-size="21">Every artifact below is regenerated from the committed code and verified by GitHub Actions.</text>
  <text x="64" y="594" fill="#6e91b2" font-family="Arial, sans-serif" font-size="17">Live demo: https://ai-erp-assistant-2ehm.onrender.com</text>
</svg>\n`;
}

async function collectApiEvidence() {
  const server = createAppServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not resolve test server port.");
  const baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    const health = await fetch(`${baseUrl}/health`).then((response) => response.json());
    const summary = await fetch(`${baseUrl}/api/summary`).then((response) => response.json());
    const questions = [
      "Quais pedidos estão atrasados?",
      "Como está o estoque?",
      "Existe risco na produção?",
      "Faça um resumo operacional"
    ];
    const answers = [];
    for (const question of questions) {
      const payload = await fetch(`${baseUrl}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, mode: "local" })
      }).then((response) => response.json());
      delete payload.data.generatedAt;
      answers.push({ question, response: payload });
    }
    return { health, summary, answers };
  } finally {
    server.close();
    await once(server, "close");
  }
}

export async function generateEvidence(outputDirectory = DEFAULT_OUTPUT) {
  const snapshot = buildOperationalSnapshot(orders, inventory, productionJobs, REFERENCE_DATE);
  const results = fixtures.map((fixture) => {
    const result = answerLocally(fixture.question, snapshot, FIXED_TIMESTAMP);
    const missingFacts = fixture.requiredFacts.filter((fact) => !result.answer.includes(fact));
    return {
      ...fixture,
      actualIntent: result.intent,
      missingFacts,
      passed: result.intent === fixture.expectedIntent && missingFacts.length === 0
    };
  });
  const evaluation = {
    schemaVersion: 1,
    dataSource: "synthetic",
    referenceDate: REFERENCE_DATE,
    fixtureCount: results.length,
    passed: results.filter((result) => result.passed).length,
    failed: results.filter((result) => !result.passed).length,
    results
  };

  const llmContext = toLlmContext(snapshot);
  const serializedContext = JSON.stringify(llmContext);
  const forbiddenFields = ["dueDate", "status", "plannedEndDate", "progressPct", "orderId", "sku"];
  const forbiddenIdentifiers = orders.map((order) => order.id).concat(productionJobs.map((job) => job.id));
  const privacyChecks = [
    ...forbiddenFields.map((value) => ({ check: `raw field absent: ${value}`, passed: !serializedContext.includes(value) })),
    ...forbiddenIdentifiers.map((value) => ({ check: `record identifier absent: ${value}`, passed: !serializedContext.includes(value) }))
  ];
  const privacy = {
    schemaVersion: 1,
    boundary: "aggregate-only",
    checks: privacyChecks,
    passed: privacyChecks.filter((check) => check.passed).length,
    failed: privacyChecks.filter((check) => !check.passed).length,
    contextShape: llmContext
  };

  const apiExamples = await collectApiEvidence();
  const apiChecks = [
    apiExamples.health.status === "ok",
    apiExamples.health.dataSource === "synthetic",
    apiExamples.summary.data.delayedOrders.length === 2,
    apiExamples.answers.every((answer) => answer.response.data.mode === "local")
  ];
  const metrics = {
    fixturesPassed: evaluation.passed,
    fixturesTotal: evaluation.fixtureCount,
    privacyPassed: privacy.passed,
    privacyTotal: privacy.checks.length,
    apiPassed: apiChecks.filter(Boolean).length,
    apiTotal: apiChecks.length
  };

  if (evaluation.failed || privacy.failed || metrics.apiPassed !== metrics.apiTotal) {
    const failureDetails = {
      evaluation: results.filter((result) => !result.passed),
      privacy: privacyChecks.filter((check) => !check.passed),
      apiChecks
    };
    throw new Error(`Evidence generation detected a failed check: ${JSON.stringify(failureDetails)}`);
  }

  await mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    writeFile(resolve(outputDirectory, "evaluation-report.json"), json(evaluation)),
    writeFile(resolve(outputDirectory, "privacy-report.json"), json(privacy)),
    writeFile(resolve(outputDirectory, "api-examples.json"), json(apiExamples)),
    writeFile(resolve(outputDirectory, "evidence-summary.svg"), buildSummarySvg(metrics))
  ]);
  return metrics;
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  const outputArg = process.argv.indexOf("--output");
  const outputDirectory = outputArg >= 0 ? resolve(process.argv[outputArg + 1]) : DEFAULT_OUTPUT;
  const metrics = await generateEvidence(outputDirectory);
  console.log(`Evidence generated: ${metrics.fixturesPassed}/${metrics.fixturesTotal} fixtures passed.`);
}
