import {
  pgTable,
  text,
  timestamp,
  integer,
  numeric,
  uniqueIndex,
  index,
  serial,
  primaryKey,
} from "drizzle-orm/pg-core";

export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  unit: text("unit").notNull().default("each"),
  currentStock: numeric("current_stock", { precision: 12, scale: 3 })
    .notNull()
    .default("0"),
  reorderLeadDays: integer("reorder_lead_days").notNull().default(3),
  safetyStockDays: integer("safety_stock_days").notNull().default(2),
  reorderUrl: text("reorder_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const squareCatalogItems = pgTable(
  "square_catalog_items",
  {
    id: serial("id").primaryKey(),
    squareVariationId: text("square_variation_id").notNull(),
    squareItemId: text("square_item_id").notNull(),
    name: text("name").notNull(),
    variationName: text("variation_name"),
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    variationUnique: uniqueIndex("square_variation_unique").on(t.squareVariationId),
  }),
);

export const recipes = pgTable(
  "recipes",
  {
    squareCatalogItemId: integer("square_catalog_item_id")
      .notNull()
      .references(() => squareCatalogItems.id, { onDelete: "cascade" }),
    inventoryItemId: integer("inventory_item_id")
      .notNull()
      .references(() => inventoryItems.id, { onDelete: "cascade" }),
    quantityPerSale: numeric("quantity_per_sale", { precision: 12, scale: 3 })
      .notNull()
      .default("1"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.squareCatalogItemId, t.inventoryItemId] }),
  }),
);

export const consumptionLog = pgTable(
  "consumption_log",
  {
    id: serial("id").primaryKey(),
    squareOrderId: text("square_order_id").notNull(),
    squareLineItemUid: text("square_line_item_uid").notNull(),
    inventoryItemId: integer("inventory_item_id")
      .notNull()
      .references(() => inventoryItems.id, { onDelete: "cascade" }),
    quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    unique: uniqueIndex("consumption_order_line_item_unique").on(
      t.squareOrderId,
      t.squareLineItemUid,
      t.inventoryItemId,
    ),
    occurredIdx: index("consumption_occurred_idx").on(t.occurredAt),
    itemIdx: index("consumption_item_idx").on(t.inventoryItemId),
  }),
);

export const stockAdjustments = pgTable("stock_adjustments", {
  id: serial("id").primaryKey(),
  inventoryItemId: integer("inventory_item_id")
    .notNull()
    .references(() => inventoryItems.id, { onDelete: "cascade" }),
  // One of these gets set. `newTotal` is a fresh count; `delta` is relative.
  newTotal: numeric("new_total", { precision: 12, scale: 3 }),
  delta: numeric("delta", { precision: 12, scale: 3 }),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const alertsSent = pgTable(
  "alerts_sent",
  {
    id: serial("id").primaryKey(),
    inventoryItemId: integer("inventory_item_id")
      .notNull()
      .references(() => inventoryItems.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    itemKindIdx: index("alerts_item_kind_idx").on(t.inventoryItemId, t.kind, t.sentAt),
  }),
);

export const syncState = pgTable("sync_state", {
  id: integer("id").primaryKey().default(1),
  lastOrderSyncAt: timestamp("last_order_sync_at", { withTimezone: true }),
  lastCatalogSyncAt: timestamp("last_catalog_sync_at", { withTimezone: true }),
});

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type NewInventoryItem = typeof inventoryItems.$inferInsert;
export type SquareCatalogItem = typeof squareCatalogItems.$inferSelect;
export type Recipe = typeof recipes.$inferSelect;
