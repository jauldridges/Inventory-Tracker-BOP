import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export default async function ActivityPage() {
  const rows = await db
    .select({
      id: schema.consumptionLog.id,
      occurredAt: schema.consumptionLog.occurredAt,
      quantity: schema.consumptionLog.quantity,
      orderId: schema.consumptionLog.squareOrderId,
      itemName: schema.inventoryItems.name,
      unit: schema.inventoryItems.unit,
      squareItemName: schema.squareCatalogItems.name,
      squareVariationName: schema.squareCatalogItems.variationName,
    })
    .from(schema.consumptionLog)
    .innerJoin(
      schema.inventoryItems,
      eq(schema.consumptionLog.inventoryItemId, schema.inventoryItems.id),
    )
    .leftJoin(
      schema.squareCatalogItems,
      eq(
        schema.consumptionLog.squareVariationId,
        schema.squareCatalogItems.squareVariationId,
      ),
    )
    .orderBy(desc(schema.consumptionLog.occurredAt))
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Activity</h1>
        <p className="text-sm text-neutral-600">
          Last 100 sales that decremented inventory. Each row is one consumable
          drawn down by one Square order line item. Times are Eastern.
        </p>
      </div>

      <section className="border rounded bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left">
            <tr>
              <th className="px-4 py-2">When</th>
              <th className="px-4 py-2">Sold (Square item)</th>
              <th className="px-4 py-2">Consumed (inventory)</th>
              <th className="px-4 py-2 text-right">Qty</th>
              <th className="px-4 py-2">Square order</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                  Nothing yet. Once Square orders sync and match a recipe, they
                  show up here.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                    {dateFormatter.format(new Date(r.occurredAt))}
                  </td>
                  <td className="px-4 py-3">
                    {r.squareItemName ? (
                      <>
                        {r.squareItemName}
                        {r.squareVariationName ? (
                          <span className="text-neutral-500">
                            {" "}
                            — {r.squareVariationName}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{r.itemName}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {Number.parseFloat(r.quantity)} {r.unit}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-neutral-500">
                    {r.orderId.slice(0, 12)}…
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
