import type {
  CustomerVolume,
  InventoryItem,
  OperationalSnapshot,
  Order,
  ProductionJob
} from "../types.ts";

const CLOSED_STATUSES = new Set(["shipped", "delivered"]);

function parseDateOnly(value: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ISO date: ${value}`);
  }
  return date;
}

function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86_400_000));
}

export function buildOperationalSnapshot(
  orders: Order[],
  inventory: InventoryItem[],
  productionJobs: ProductionJob[],
  referenceDate: string
): OperationalSnapshot {
  const today = parseDateOnly(referenceDate);
  const delayedOrders = orders
    .filter((order) => !CLOSED_STATUSES.has(order.status) && parseDateOnly(order.dueDate) < today)
    .map((order) => ({
      id: order.id,
      customer: order.customer,
      dueDate: order.dueDate,
      daysLate: daysBetween(parseDateOnly(order.dueDate), today),
      value: order.value
    }))
    .sort((a, b) => b.daysLate - a.daysLate);

  const customerMap = new Map<string, CustomerVolume>();
  for (const order of orders) {
    const current = customerMap.get(order.customer) ?? {
      customer: order.customer,
      orderCount: 0,
      orderValue: 0
    };
    current.orderCount += 1;
    current.orderValue += order.value;
    customerMap.set(order.customer, current);
  }

  const customerVolumes = [...customerMap.values()].sort(
    (a, b) => b.orderValue - a.orderValue
  );
  const delayedOrderIds = new Set(delayedOrders.map((order) => order.id));
  const productionRisks = productionJobs
    .filter((job) => delayedOrderIds.has(job.orderId) || parseDateOnly(job.plannedEndDate) < today)
    .map((job) => ({
      ...job,
      reason: delayedOrderIds.has(job.orderId)
        ? "linked order is late"
        : "planned production end date has passed"
    }));

  return {
    referenceDate,
    totalOrders: orders.length,
    openOrders: orders.filter((order) => !CLOSED_STATUSES.has(order.status)).length,
    delayedOrders,
    totalOrderValue: orders.reduce((total, order) => total + order.value, 0),
    delayedOrderValue: delayedOrders.reduce((total, order) => total + order.value, 0),
    lowStockItems: inventory.filter((item) => item.current <= item.minimum),
    productionRisks,
    customerVolumes
  };
}

export function toLlmContext(snapshot: OperationalSnapshot) {
  return {
    referenceDate: snapshot.referenceDate,
    metrics: {
      totalOrders: snapshot.totalOrders,
      openOrders: snapshot.openOrders,
      delayedOrders: snapshot.delayedOrders.length,
      delayedOrderValue: snapshot.delayedOrderValue,
      lowStockItems: snapshot.lowStockItems.length,
      productionRisks: snapshot.productionRisks.length
    },
    topCustomers: snapshot.customerVolumes.slice(0, 3),
    lowStockSummary: snapshot.lowStockItems.map(({ name, current, minimum, unit }) => ({
      name,
      current,
      minimum,
      unit
    }))
  };
}
