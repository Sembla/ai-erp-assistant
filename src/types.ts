export type OrderStatus = "planned" | "production" | "shipped" | "delivered";

export type Order = {
  id: string;
  customer: string;
  dueDate: string;
  status: OrderStatus;
  value: number;
};

export type InventoryItem = {
  sku: string;
  name: string;
  current: number;
  minimum: number;
  unit: string;
};

export type ProductionJob = {
  id: string;
  orderId: string;
  line: string;
  progressPct: number;
  plannedEndDate: string;
};

export type CustomerVolume = {
  customer: string;
  orderCount: number;
  orderValue: number;
};

export type OperationalSnapshot = {
  referenceDate: string;
  totalOrders: number;
  openOrders: number;
  delayedOrders: Array<{
    id: string;
    customer: string;
    dueDate: string;
    daysLate: number;
    value: number;
  }>;
  totalOrderValue: number;
  delayedOrderValue: number;
  lowStockItems: InventoryItem[];
  productionRisks: Array<ProductionJob & { reason: string }>;
  customerVolumes: CustomerVolume[];
};

export type AssistantAnswer = {
  mode: "local" | "llm";
  answer: string;
  intent: string;
  generatedAt: string;
  warning?: string;
};
