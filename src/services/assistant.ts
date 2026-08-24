import type { AssistantAnswer, OperationalSnapshot } from "../types.ts";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function currency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

export function answerLocally(
  question: string,
  snapshot: OperationalSnapshot,
  generatedAt = new Date().toISOString()
): AssistantAnswer {
  const clean = normalize(question);
  if (!clean || clean.length > 500) {
    throw new Error("Question must contain between 1 and 500 characters.");
  }

  if (/atras|prazo|delay/.test(clean)) {
    const items = snapshot.delayedOrders
      .map((order) => `${order.id} (${order.daysLate} dia(s), ${currency(order.value)})`)
      .join("; ");
    return {
      mode: "local",
      intent: "delayed_orders",
      answer: snapshot.delayedOrders.length
        ? `${snapshot.delayedOrders.length} pedido(s) em atraso: ${items}. Valor associado: ${currency(snapshot.delayedOrderValue)}.`
        : "Não há pedidos em atraso na data de referência.",
      generatedAt
    };
  }

  if (/estoque|material|falta|stock|item|minimo/.test(clean)) {
    const items = snapshot.lowStockItems
      .map((item) => `${item.name}: ${item.current}/${item.minimum} ${item.unit}`)
      .join("; ");
    return {
      mode: "local",
      intent: "inventory_risk",
      answer: snapshot.lowStockItems.length
        ? `${snapshot.lowStockItems.length} item(ns) no nível mínimo ou abaixo: ${items}.`
        : "Nenhum item está no nível mínimo ou abaixo.",
      generatedAt
    };
  }

  if (/producao|linha|operacao/.test(clean)) {
    const jobs = snapshot.productionRisks
      .map((job) => `${job.id}/${job.orderId} — ${job.progressPct}%`)
      .join("; ");
    return {
      mode: "local",
      intent: "production_risk",
      answer: snapshot.productionRisks.length
        ? `${snapshot.productionRisks.length} ordem(ns) de produção exigem atenção: ${jobs}.`
        : "Nenhuma ordem de produção foi sinalizada pelas regras atuais.",
      generatedAt
    };
  }

  if (/cliente|volume|maior/.test(clean)) {
    const top = snapshot.customerVolumes[0];
    return {
      mode: "local",
      intent: "top_customer",
      answer: top
        ? `${top.customer} possui o maior volume: ${top.orderCount} pedido(s), totalizando ${currency(top.orderValue)}.`
        : "Não há pedidos para calcular o volume por cliente.",
      generatedAt
    };
  }

  if (/valor|faturamento|carteira/.test(clean)) {
    return {
      mode: "local",
      intent: "order_value",
      answer: `A carteira simulada totaliza ${currency(snapshot.totalOrderValue)}; ${currency(snapshot.delayedOrderValue)} estão associados a pedidos em atraso.`,
      generatedAt
    };
  }

  return {
    mode: "local",
    intent: "operational_summary",
    answer: `Resumo em ${snapshot.referenceDate}: ${snapshot.openOrders} pedido(s) aberto(s), ${snapshot.delayedOrders.length} em atraso, ${snapshot.lowStockItems.length} item(ns) com estoque crítico e ${snapshot.productionRisks.length} risco(s) de produção.`,
    generatedAt
  };
}
