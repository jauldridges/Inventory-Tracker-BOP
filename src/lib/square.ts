import { SquareClient, SquareEnvironment } from "square";
import { env } from "./env";

export const square = new SquareClient({
  token: env.SQUARE_ACCESS_TOKEN,
  environment:
    env.SQUARE_ENVIRONMENT === "production"
      ? SquareEnvironment.Production
      : SquareEnvironment.Sandbox,
});

export interface FlatCatalogItem {
  squareVariationId: string;
  squareItemId: string;
  name: string;
  variationName: string | null;
}

export async function listCatalogItems(): Promise<FlatCatalogItem[]> {
  const out: FlatCatalogItem[] = [];
  const page = await square.catalog.list({ types: "ITEM" });

  for await (const obj of page) {
    if (obj.type !== "ITEM" || !obj.itemData) continue;
    const itemName = obj.itemData.name ?? "(unnamed)";
    const variations = obj.itemData.variations ?? [];
    for (const v of variations) {
      if (v.type !== "ITEM_VARIATION" || !v.itemVariationData) continue;
      out.push({
        squareItemId: obj.id,
        squareVariationId: v.id,
        name: itemName,
        variationName: v.itemVariationData.name ?? null,
      });
    }
  }

  return out;
}

export interface FlatOrderLineItem {
  orderId: string;
  lineItemUid: string;
  catalogObjectId: string | null;
  quantity: number;
  createdAt: Date;
  orderFulfillmentTypes: string[];
}

export async function searchCompletedOrdersSince(
  since: Date,
): Promise<FlatOrderLineItem[]> {
  const out: FlatOrderLineItem[] = [];
  let cursor: string | undefined;

  do {
    const resp = await square.orders.search({
      locationIds: [env.SQUARE_LOCATION_ID],
      cursor,
      limit: 500,
      query: {
        filter: {
          stateFilter: { states: ["COMPLETED"] },
          dateTimeFilter: {
            closedAt: {
              startAt: since.toISOString(),
            },
          },
        },
        sort: {
          sortField: "CLOSED_AT",
          sortOrder: "ASC",
        },
      },
    });

    for (const order of resp.orders ?? []) {
      const createdAt = order.closedAt
        ? new Date(order.closedAt)
        : order.createdAt
          ? new Date(order.createdAt)
          : new Date();
      const orderFulfillmentTypes: string[] = [];
      for (const f of order.fulfillments ?? []) {
        if (f.type) orderFulfillmentTypes.push(String(f.type));
      }
      for (const line of order.lineItems ?? []) {
        const qty = Number.parseFloat(line.quantity ?? "1");
        if (!Number.isFinite(qty) || qty <= 0) continue;
        out.push({
          orderId: order.id ?? "",
          lineItemUid: line.uid ?? "",
          catalogObjectId: line.catalogObjectId ?? null,
          quantity: qty,
          createdAt,
          orderFulfillmentTypes,
        });
      }
    }

    cursor = resp.cursor ?? undefined;
  } while (cursor);

  return out;
}
