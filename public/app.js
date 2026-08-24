const form = document.querySelector("#question-form");
const questionInput = document.querySelector("#question");
const modeSelect = document.querySelector("#mode");
const answerBox = document.querySelector("#answer");

function updateMetric(id, value) {
  document.querySelector(id).textContent = String(value);
}

async function loadSummary() {
  const response = await fetch("/api/summary");
  if (!response.ok) throw new Error("Não foi possível carregar os indicadores.");
  const { data } = await response.json();
  updateMetric("#open-orders", data.openOrders);
  updateMetric("#late-orders", data.delayedOrders.length);
  updateMetric("#low-stock", data.lowStockItems.length);
  updateMetric("#production-risk", data.productionRisks.length);
}

async function ask(question) {
  answerBox.textContent = "Analisando…";
  const response = await fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, mode: modeSelect.value })
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Falha na análise.");
  answerBox.innerHTML = "";
  const answer = document.createElement("p");
  answer.textContent = payload.data.answer;
  answerBox.append(answer);
  if (payload.data.warning) {
    const warning = document.createElement("small");
    warning.textContent = `Fallback local: ${payload.data.warning}`;
    answerBox.append(warning);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await ask(questionInput.value);
  } catch (error) {
    answerBox.textContent = error instanceof Error ? error.message : "Erro inesperado.";
  }
});

document.querySelectorAll("[data-question]").forEach((button) => {
  button.addEventListener("click", () => {
    questionInput.value = button.dataset.question;
    form.requestSubmit();
  });
});

loadSummary().catch((error) => {
  answerBox.textContent = error.message;
});
