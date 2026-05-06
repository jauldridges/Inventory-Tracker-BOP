import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { applyStockAdjustment } from "@/lib/consumption";

async function createItemAction(formData: FormData) {
  "use server";
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const unit = String(formData.get("unit") ?? "each").trim() || "each";
  const initialStock = Number.parseFloat(String(formData.get("stock") ?? "0")) || 0;
  const leadDays = Number.parseInt(String(formData.get("lead") ?? "3"), 10) || 3;
  const safetyDays = Number.parseInt(String(formData.get("safety") ?? "2"), 10) || 2;
  const reorderUrl =
    String(formData.get("reorderUrl") ?? "").trim() || null;

  await db.insert(schema.inventoryItems).values({
    name,
    unit,
    currentStock: initialStock.toString(),
    reorderLeadDays: leadDays,
    safetyStockDays: safetyDays,
    reorderUrl,
  });
  revalidatePath("/inventory");
  revalidatePath("/");
}

async function countAction(formData: FormData) {
  "use server";
  const id = Number.parseInt(String(formData.get("id") ?? "0"), 10);
  const newTotal = Number.parseFloat(String(formData.get("newTotal") ?? ""));
  if (!id || !Number.isFinite(newTotal)) return;
  await applyStockAdjustment({
    inventoryItemId: id,
    newTotal,
    reason: "manual count",
  });
  revalidatePath("/inventory");
  revalidatePath("/");
}

async function updateItemAction(formData: FormData) {
  "use server";
  const id = Number.parseInt(String(formData.get("id") ?? "0"), 10);
  if (!id) return;
  const name = String(formData.get("name") ?? "").trim();
  const leadDays = Number.parseInt(String(formData.get("lead") ?? "3"), 10) || 3;
  const safetyDays = Number.parseInt(String(formData.get("safety") ?? "2"), 10) || 2;
  const reorderUrl = String(formData.get("reorderUrl") ?? "").trim() || null;
  await db
    .update(schema.inventoryItems)
    .set({
      ...(name ? { name } : {}),
      reorderLeadDays: leadDays,
      safetyStockDays: safetyDays,
      reorderUrl,
      updatedAt: new Date(),
    })
    .where(eq(schema.inventoryItems.id, id));
  revalidatePath("/inventory");
  revalidatePath("/");
}

async function deleteItemAction(formData: FormData) {
  "use server";
  const id = Number.parseInt(String(formData.get("id") ?? "0"), 10);
  if (!id) return;
  await db.delete(schema.inventoryItems).where(eq(schema.inventoryItems.id, id));
  revalidatePath("/inventory");
  revalidatePath("/");
}

export default async function InventoryPage() {
  const items = await db
    .select()
    .from(schema.inventoryItems)
    .orderBy(schema.inventoryItems.name);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Inventory</h1>

      <section className="border rounded bg-white p-4">
        <h2 className="font-medium mb-3">Add item</h2>
        <form action={createItemAction} className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <input
            name="name"
            required
            placeholder="Name (e.g. 12oz cup)"
            className="col-span-2 border rounded px-3 py-2 text-sm"
          />
          <input
            name="unit"
            defaultValue="each"
            placeholder="Unit"
            className="border rounded px-3 py-2 text-sm"
          />
          <input
            name="stock"
            type="number"
            step="0.01"
            defaultValue="0"
            placeholder="On hand"
            className="border rounded px-3 py-2 text-sm"
          />
          <input
            name="lead"
            type="number"
            defaultValue="3"
            placeholder="Lead days"
            className="border rounded px-3 py-2 text-sm"
          />
          <input
            name="safety"
            type="number"
            defaultValue="2"
            placeholder="Safety days"
            className="border rounded px-3 py-2 text-sm"
          />
          <input
            name="reorderUrl"
            placeholder="Reorder URL (optional)"
            className="col-span-5 border rounded px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="bg-black text-white rounded px-3 py-2 text-sm hover:bg-neutral-800"
          >
            Add
          </button>
        </form>
      </section>

      <section className="border rounded bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Unit</th>
              <th className="px-4 py-2 text-right">On hand</th>
              <th className="px-4 py-2">Record count</th>
              <th className="px-4 py-2">Lead / safety</th>
              <th className="px-4 py-2">Reorder URL</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-neutral-500">
                  No items yet.
                </td>
              </tr>
            ) : (
              items.map((it) => {
                const formId = `update-${it.id}`;
                return (
                <tr key={it.id} className="border-t align-middle">
                  <td className="px-4 py-3">
                    <input
                      form={formId}
                      name="name"
                      defaultValue={it.name}
                      className="border rounded px-2 py-1 text-sm font-medium w-full"
                    />
                  </td>
                  <td className="px-4 py-3">{it.unit}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {Number.parseFloat(it.currentStock).toFixed(0)}
                  </td>
                  <td className="px-4 py-3">
                    <form action={countAction} className="flex gap-2">
                      <input type="hidden" name="id" value={it.id} />
                      <input
                        name="newTotal"
                        type="number"
                        step="0.01"
                        placeholder="New total"
                        className="border rounded px-2 py-1 text-sm w-28"
                      />
                      <button
                        type="submit"
                        className="text-sm border rounded px-2 py-1 hover:bg-neutral-50"
                      >
                        Save
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3">
                    <form id={formId} action={updateItemAction} className="flex gap-2 items-center">
                      <input type="hidden" name="id" value={it.id} />
                      <input
                        name="lead"
                        type="number"
                        defaultValue={it.reorderLeadDays}
                        className="border rounded px-2 py-1 text-sm w-16"
                      />
                      <span className="text-neutral-500">/</span>
                      <input
                        name="safety"
                        type="number"
                        defaultValue={it.safetyStockDays}
                        className="border rounded px-2 py-1 text-sm w-16"
                      />
                      <input
                        name="reorderUrl"
                        defaultValue={it.reorderUrl ?? ""}
                        placeholder="Reorder URL"
                        className="border rounded px-2 py-1 text-sm w-40"
                      />
                      <button
                        type="submit"
                        className="text-sm border rounded px-2 py-1 hover:bg-neutral-50"
                      >
                        Update
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3 max-w-[12rem] truncate">
                    {it.reorderUrl ? (
                      <a
                        href={it.reorderUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {it.reorderUrl}
                      </a>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={deleteItemAction}>
                      <input type="hidden" name="id" value={it.id} />
                      <button
                        type="submit"
                        className="text-sm text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
