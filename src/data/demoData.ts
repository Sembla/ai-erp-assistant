import type { InventoryItem, Order, ProductionJob } from "../types.ts";

// Fictional records created only for this portfolio demonstration.
export const orders: Order[] = [
  { id: "PED-1001", customer: "Cliente Atlas", dueDate: "2026-08-20", status: "production", value: 18_000 },
  { id: "PED-1002", customer: "Cliente Boreal", dueDate: "2026-08-18", status: "shipped", value: 8_500 },
  { id: "PED-1003", customer: "Cliente Cobalto", dueDate: "2026-08-28", status: "planned", value: 14_200 },
  { id: "PED-1004", customer: "Cliente Atlas", dueDate: "2026-08-22", status: "production", value: 12_400 },
  { id: "PED-1005", customer: "Cliente Delta", dueDate: "2026-08-15", status: "delivered", value: 6_800 }
];

export const inventory: InventoryItem[] = [
  { sku: "MAT-001", name: "Painel MDF branco", current: 18, minimum: 20, unit: "chapas" },
  { sku: "MAT-002", name: "Perfil de alumínio", current: 86, minimum: 45, unit: "metros" },
  { sku: "MAT-003", name: "Corrediça telescópica", current: 24, minimum: 24, unit: "pares" },
  { sku: "MAT-004", name: "Fita de borda", current: 240, minimum: 120, unit: "metros" }
];

export const productionJobs: ProductionJob[] = [
  { id: "OP-701", orderId: "PED-1001", line: "Corte e usinagem", progressPct: 72, plannedEndDate: "2026-08-23" },
  { id: "OP-702", orderId: "PED-1004", line: "Montagem", progressPct: 41, plannedEndDate: "2026-08-24" },
  { id: "OP-703", orderId: "PED-1003", line: "Planejamento", progressPct: 15, plannedEndDate: "2026-08-26" }
];
