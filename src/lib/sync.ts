import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { listCatalogItems, searchCompletedOrdersSince } from "./square";
import { applyOrderLinesToInventory } from "./consumption";
import { checkAndSendAlerts } from "./alerts";

async function getOrInitSyncState() {
  const rows = await db.select().from(schema.syncState).limit(1);
  if (rows.length > 0) return rows[0];
  const [created] = await db
    .insert(schema.syncState)
    .values({ id: 1 })
    .returning();
  return created;
}

export async function syncSquareCatalog() {
  const items = await listCatalogItems();

  for (const item of items) {
    await db
      .insert(schema.squareCatalogItems)
      .values({
        squareVariationId: item.squareVariationId,
        squareItemId: item.squareItemId,
        name: item.name,
        variationName: item.variationName,
      })
      .onConflictDoUpdate({
        target: schema.squareCatalogItems.squareVariationId,
        set: {
          squareItemId: item.squareItemId,
          name: item.name,
          variationName: item.variationName,
          syncedAt: new Date(),
        },
      });
  }

  await db
    .insert(schema.syncState)
    .values({ id: 1, lastCatalogSyncAt: new Date() })
    .onConflictDoUpdate({
      target: schema.syncState.id,
      set: { lastCatalogSyncAt: new Date() },
    });

  return { synced: items.length };
}

export async function syncSquareOrders() {
  const state = await getOrInitSyncState();
  // Default to pulling the last 24h on first run.
  const since =
    state.lastOrderSyncAt ?? new Date(Date.now() - 24 * 60 * 60 * 1000);
  const now = new Date();

  const lines = await searchCompletedOrdersSince(since);
  const result = await applyOrderLinesToInventory(lines);

  await db
    .update(schema.syncState)
    .set({ lastOrderSyncAt: now })
    .where(eq(schema.syncState.id, 1));

  const alerts = await checkAndSendAlerts();

  return { ...result, alerts, since: since.toISOString(), until: now.toISOString() };
}
