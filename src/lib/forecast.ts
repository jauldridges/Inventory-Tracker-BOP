import { and, eq, gte, sql } from "drizzle-orm";
import { db, schema } from "@/db";

const FORECAST_WINDOW_DAYS = 14;

export type Status = "ok" | "warning" | "reorder";

export interface ForecastRow {
  id: number;
  name: string;
  unit: string;
  currentStock: number;
  avgDailyUse: number;
  daysOfSupply: number;
  reorderLeadDays: number;
  safetyStockDays: number;
  reorderThresholdDays: number;
  status: Status;
  reorderUrl: string | null;
}

export async function forecastAll(): Promise<ForecastRow[]> {
  const items = await db.select().from(schema.inventoryItems).orderBy(schema.inventoryItems.name);
  const now = new Date();
  const since = new Date(now.getTime() - FORECAST_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const usage = await db
    .select({
      inventoryItemId: schema.consumptionLog.inventoryItemId,
      total: sql<string>`sum(${schema.consumptionLog.quantity})`,
      first: sql<string>`min(${schema.consumptionLog.occurredAt})`,
    })
    .from(schema.consumptionLog)
    .where(gte(schema.consumptionLog.occurredAt, since))
    .groupBy(schema.consumptionLog.inventoryItemId);

  const avgByItem = new Map<number, number>();
  for (const u of usage) {
    const total = Number.parseFloat(u.total) || 0;
    const first = u.first ? new Date(u.first) : since;
    const dataDays = Math.max(
      1,
      (now.getTime() - first.getTime()) / (24 * 60 * 60 * 1000),
    );
    const effectiveWindow = Math.min(FORECAST_WINDOW_DAYS, dataDays);
    avgByItem.set(u.inventoryItemId, total / effectiveWindow);
  }

  return items.map((it) => {
    const avgDailyUse = avgByItem.get(it.id) ?? 0;
    const stock = Number.parseFloat(it.currentStock);
    const daysOfSupply = avgDailyUse > 0 ? stock / avgDailyUse : Number.POSITIVE_INFINITY;
    const threshold = it.reorderLeadDays + it.safetyStockDays;

    let status: Status = "ok";
    if (daysOfSupply < it.reorderLeadDays) status = "reorder";
    else if (daysOfSupply < threshold) status = "warning";
    // If avg usage is 0 we don't have a forecast yet — stay "ok".
    if (!Number.isFinite(daysOfSupply)) status = "ok";

    return {
      id: it.id,
      name: it.name,
      unit: it.unit,
      currentStock: stock,
      avgDailyUse,
      daysOfSupply,
      reorderLeadDays: it.reorderLeadDays,
      safetyStockDays: it.safetyStockDays,
      reorderThresholdDays: threshold,
      status,
      reorderUrl: it.reorderUrl,
    };
  });
}

export function needsReorder(row: ForecastRow): boolean {
  return row.status !== "ok" && Number.isFinite(row.daysOfSupply);
}
