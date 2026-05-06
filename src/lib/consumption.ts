import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { FlatOrderLineItem } from "./square";

export interface ConsumptionResult {
  ordersProcessed: number;
  lineItemsProcessed: number;
  consumptionRowsInserted: number;
  unmappedCatalogObjectIds: string[];
}

/**
 * Applies a batch of Square order line items to local inventory.
 * Idempotent: the consumption_log has a unique index on
 * (order_id, line_item_uid, inventory_item_id) and conflicting inserts are skipped.
 */
export async function applyOrderLinesToInventory(
  lines: FlatOrderLineItem[],
): Promise<ConsumptionResult> {
  const seenOrders = new Set<string>();
  let lineItemsProcessed = 0;
  let rowsInserted = 0;
  const unmapped = new Set<string>();

  // Gather unique catalog IDs we saw in this batch.
  const catalogIds = Array.from(
    new Set(lines.map((l) => l.catalogObjectId).filter((x): x is string => !!x)),
  );
  if (catalogIds.length === 0) {
    return {
      ordersProcessed: new Set(lines.map((l) => l.orderId)).size,
      lineItemsProcessed: lines.length,
      consumptionRowsInserted: 0,
      unmappedCatalogObjectIds: [],
    };
  }

  // Pull all recipes for those catalog IDs in one query.
  const recipeRows = await db
    .select({
      squareVariationId: schema.squareCatalogItems.squareVariationId,
      inventoryItemId: schema.recipes.inventoryItemId,
      quantityPerSale: schema.recipes.quantityPerSale,
    })
    .from(schema.recipes)
    .innerJoin(
      schema.squareCatalogItems,
      eq(schema.recipes.squareCatalogItemId, schema.squareCatalogItems.id),
    )
    .where(
      sql`${schema.squareCatalogItems.squareVariationId} IN (${sql.join(
        catalogIds.map((id) => sql`${id}`),
        sql`, `,
      )})`,
    );

  const recipesByCatalog = new Map<
    string,
    Array<{ inventoryItemId: number; quantityPerSale: string }>
  >();
  for (const r of recipeRows) {
    const arr = recipesByCatalog.get(r.squareVariationId) ?? [];
    arr.push({
      inventoryItemId: r.inventoryItemId,
      quantityPerSale: r.quantityPerSale,
    });
    recipesByCatalog.set(r.squareVariationId, arr);
  }

  // Accumulate per-item decrements to minimize round trips.
  const decrementsByItem = new Map<number, number>();

  for (const line of lines) {
    seenOrders.add(line.orderId);
    lineItemsProcessed++;

    if (!line.catalogObjectId) continue;
    const mappings = recipesByCatalog.get(line.catalogObjectId);
    if (!mappings || mappings.length === 0) {
      unmapped.add(line.catalogObjectId);
      continue;
    }

    for (const m of mappings) {
      const consumed = Number.parseFloat(m.quantityPerSale) * line.quantity;
      if (!Number.isFinite(consumed) || consumed <= 0) continue;

      const inserted = await db
        .insert(schema.consumptionLog)
        .values({
          squareOrderId: line.orderId,
          squareLineItemUid: line.lineItemUid,
          squareVariationId: line.catalogObjectId,
          inventoryItemId: m.inventoryItemId,
          quantity: consumed.toString(),
          occurredAt: line.createdAt,
        })
        .onConflictDoNothing()
        .returning({ id: schema.consumptionLog.id });

      if (inserted.length > 0) {
        rowsInserted++;
        decrementsByItem.set(
          m.inventoryItemId,
          (decrementsByItem.get(m.inventoryItemId) ?? 0) + consumed,
        );
      }
    }
  }

  // Apply decrements to cached current_stock.
  for (const [itemId, delta] of decrementsByItem.entries()) {
    await db
      .update(schema.inventoryItems)
      .set({
        currentStock: sql`${schema.inventoryItems.currentStock} - ${delta.toString()}`,
        updatedAt: new Date(),
      })
      .where(eq(schema.inventoryItems.id, itemId));
  }

  return {
    ordersProcessed: seenOrders.size,
    lineItemsProcessed,
    consumptionRowsInserted: rowsInserted,
    unmappedCatalogObjectIds: Array.from(unmapped),
  };
}

export async function applyStockAdjustment(params: {
  inventoryItemId: number;
  newTotal?: number;
  delta?: number;
  reason?: string;
}) {
  if (params.newTotal === undefined && params.delta === undefined) {
    throw new Error("Must provide newTotal or delta");
  }

  await db.insert(schema.stockAdjustments).values({
    inventoryItemId: params.inventoryItemId,
    newTotal: params.newTotal?.toString(),
    delta: params.delta?.toString(),
    reason: params.reason,
  });

  if (params.newTotal !== undefined) {
    await db
      .update(schema.inventoryItems)
      .set({
        currentStock: params.newTotal.toString(),
        updatedAt: new Date(),
      })
      .where(eq(schema.inventoryItems.id, params.inventoryItemId));
  } else if (params.delta !== undefined) {
    await db
      .update(schema.inventoryItems)
      .set({
        currentStock: sql`${schema.inventoryItems.currentStock} + ${params.delta.toString()}`,
        updatedAt: new Date(),
      })
      .where(eq(schema.inventoryItems.id, params.inventoryItemId));
  }
}
