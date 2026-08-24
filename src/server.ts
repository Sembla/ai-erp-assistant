import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { orders, inventory, productionJobs } from "./data/demoData.ts";
import { buildOperationalSnapshot } from "./services/analytics.ts";
import { answerLocally } from "./services/assistant.ts";
import { answerWithLlm } from "./services/llm.ts";

const PUBLIC_FILES = new Map([
  ["/", ["../public/index.html", "text/html; charset=utf-8"]],
  ["/app.js", ["../public/app.js", "text/javascript; charset=utf-8"]],
  ["/styles.css", ["../public/styles.css", "text/css; charset=utf-8"]]
]);

function json(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(JSON.stringify(body));
}

async function readJsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > 65_536) throw new Error("Request body is too large.");
    chunks.push(buffer);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function getSnapshot() {
  const referenceDate = process.env.DEMO_REFERENCE_DATE || "2026-08-24";
  return buildOperationalSnapshot(orders, inventory, productionJobs, referenceDate);
}

export function createAppServer() {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://localhost");

      if (request.method === "GET" && url.pathname === "/health") {
        json(response, 200, { status: "ok", dataSource: "synthetic" });
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/summary") {
        json(response, 200, { data: getSnapshot(), dataSource: "synthetic" });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/ask") {
        const body = await readJsonBody(request);
        const question = typeof body.question === "string" ? body.question : "";
        const mode = body.mode === "llm" ? "llm" : "local";
        const snapshot = getSnapshot();

        if (mode === "llm") {
          try {
            json(response, 200, { data: await answerWithLlm(question, snapshot) });
          } catch (error) {
            const fallback = answerLocally(question, snapshot);
            fallback.warning = error instanceof Error ? error.message : "LLM mode failed.";
            json(response, 200, { data: fallback });
          }
          return;
        }

        json(response, 200, { data: answerLocally(question, snapshot) });
        return;
      }

      const publicFile = PUBLIC_FILES.get(url.pathname);
      if (request.method === "GET" && publicFile) {
        const [relativePath, contentType] = publicFile;
        const body = await readFile(fileURLToPath(new URL(relativePath, import.meta.url)));
        response.writeHead(200, {
          "Content-Type": contentType,
          "Cache-Control": "no-cache",
          "X-Content-Type-Options": "nosniff"
        });
        response.end(body);
        return;
      }

      json(response, 404, { error: "Route not found." });
    } catch (error) {
      json(response, 400, {
        error: error instanceof Error ? error.message : "Unexpected request error."
      });
    }
  });
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === invokedPath) {
  const port = Number(process.env.PORT || 3001);
  createAppServer().listen(port, "127.0.0.1", () => {
    console.log(`AI ERP Assistant running at http://127.0.0.1:${port}`);
  });
}
