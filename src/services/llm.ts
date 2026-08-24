import { toLlmContext } from "./analytics.ts";
import type { AssistantAnswer, OperationalSnapshot } from "../types.ts";

function extractOutputText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const output = (payload as { output?: unknown }).output;
  if (!Array.isArray(output)) return "";
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (
        part &&
        typeof part === "object" &&
        (part as { type?: unknown }).type === "output_text" &&
        typeof (part as { text?: unknown }).text === "string"
      ) {
        return (part as { text: string }).text.trim();
      }
    }
  }
  return "";
}

export async function answerWithLlm(
  question: string,
  snapshot: OperationalSnapshot
): Promise<AssistantAnswer> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!apiKey || !model) {
    throw new Error("OPENAI_API_KEY and OPENAI_MODEL are required for LLM mode.");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      instructions:
        "Answer in concise Brazilian Portuguese. Use only the fictional aggregate ERP context provided. Do not invent facts, predictions or actions already taken.",
      input: `Pergunta: ${question}\n\nContexto agregado e fictício:\n${JSON.stringify(toLlmContext(snapshot))}`
    }),
    signal: AbortSignal.timeout(12_000)
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}.`);
  }

  const answer = extractOutputText(await response.json());
  if (!answer) throw new Error("OpenAI response did not contain text output.");

  return {
    mode: "llm",
    intent: "aggregate_operational_analysis",
    answer,
    generatedAt: new Date().toISOString()
  };
}
