import { revalidatePath } from "next/cache";
import { and, asc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { syncSquareCatalog } from "@/lib/sync";

async function syncCatalogAction() {
  "use server";
  await syncSquareCatalog();
  revalidatePath("/recipes");
}

async function addRecipeAction(formData: FormData) {
  "use server";
  const catalogId = Number.parseInt(String(formData.get("catalogId") ?? "0"), 10);
  const inventoryId = Number.parseInt(String(formData.get("inventoryId") ?? "0"), 10);
  const qty = Number.parseFloat(String(formData.get("qty") ?? "1")) || 1;
  if (!catalogId || !inventoryId) return;
  await db
    .insert(schema.recipes)
    .values({
      squareCatalogItemId: catalogId,
      inventoryItemId: inventoryId,
      quantityPerSale: qty.toString(),
    })
    .onConflictDoUpdate({
      target: [schema.recipes.squareCatalogItemId, schema.recipes.inventoryItemId],
      set: { quantityPerSale: qty.toString() },
    });
  revalidatePath("/recipes");
}

async function deleteRecipeAction(formData: FormData) {
  "use server";
  const catalogId = Number.parseInt(String(formData.get("catalogId") ?? "0"), 10);
  const inventoryId = Number.parseInt(String(formData.get("inventoryId") ?? "0"), 10);
  if (!catalogId || !inventoryId) return;
  await db
    .delete(schema.recipes)
    .where(
      and(
        eq(schema.recipes.squareCatalogItemId, catalogId),
        eq(schema.recipes.inventoryItemId, inventoryId),
      ),
    );
  revalidatePath("/recipes");
}

export default async function RecipesPage() {
  const [catalog, inventory, existingRecipes] = await Promise.all([
    db
      .select()
      .from(schema.squareCatalogItems)
      .orderBy(asc(schema.squareCatalogItems.name), asc(schema.squareCatalogItems.variationName)),
    db.select().from(schema.inventoryItems).orderBy(asc(schema.inventoryItems.name)),
    db
      .select({
        squareCatalogItemId: schema.recipes.squareCatalogItemId,
        inventoryItemId: schema.recipes.inventoryItemId,
        quantityPerSale: schema.recipes.quantityPerSale,
        catalogName: schema.squareCatalogItems.name,
        variationName: schema.squareCatalogItems.variationName,
        inventoryName: schema.inventoryItems.name,
        unit: schema.inventoryItems.unit,
      })
      .from(schema.recipes)
      .innerJoin(
        schema.squareCatalogItems,
        eq(schema.recipes.squareCatalogItemId, schema.squareCatalogItems.id),
      )
      .innerJoin(
        schema.inventoryItems,
        eq(schema.recipes.inventoryItemId, schema.inventoryItems.id),
      )
      .orderBy(asc(schema.squareCatalogItems.name)),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Recipes</h1>
          <p className="text-sm text-neutral-600">
            Map each Square item to the consumables it uses.
          </p>
        </div>
        <form action={syncCatalogAction}>
          <button
            type="submit"
            className="bg-black text-white rounded px-3 py-2 text-sm hover:bg-neutral-800"
          >
            Sync Square catalog
          </button>
        </form>
      </div>

      {catalog.length === 0 ? (
        <div className="border rounded bg-white p-8 text-center text-neutral-600">
          <p>No Square items synced yet. Click "Sync Square catalog" to pull them in.</p>
        </div>
      ) : inventory.length === 0 ? (
        <div className="border rounded bg-white p-8 text-center text-neutral-600">
          <p>
            Add some inventory items first on the{" "}
            <a href="/inventory" className="text-blue-600 hover:underline">
              Inventory
            </a>{" "}
            page.
          </p>
        </div>
      ) : (
        <section className="border rounded bg-white p-4">
          <h2 className="font-medium mb-3">Add mapping</h2>
          <form
            action={addRecipeAction}
            className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center"
          >
            <select
              name="catalogId"
              required
              className="md:col-span-2 border rounded px-3 py-2 text-sm"
            >
              <option value="">Select Square item…</option>
              {catalog.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.variationName ? ` — ${c.variationName}` : ""}
                </option>
              ))}
            </select>
            <select
              name="inventoryId"
              required
              className="md:col-span-2 border rounded px-3 py-2 text-sm"
            >
              <option value="">Select consumable…</option>
              {inventory.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                name="qty"
                type="number"
                step="0.01"
                defaultValue="1"
                className="border rounded px-3 py-2 text-sm w-24"
              />
              <button
                type="submit"
                className="bg-black text-white rounded px-3 py-2 text-sm hover:bg-neutral-800"
              >
                Add
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="border rounded bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left">
            <tr>
              <th className="px-4 py-2">Square item</th>
              <th className="px-4 py-2">Consumes</th>
              <th className="px-4 py-2 text-right">Qty per sale</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {existingRecipes.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-neutral-500">
                  No mappings yet.
                </td>
              </tr>
            ) : (
              existingRecipes.map((r) => (
                <tr key={`${r.squareCatalogItemId}-${r.inventoryItemId}`} className="border-t">
                  <td className="px-4 py-3">
                    {r.catalogName}
                    {r.variationName ? (
                      <span className="text-neutral-500"> — {r.variationName}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{r.inventoryName}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {Number.parseFloat(r.quantityPerSale)} {r.unit}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={deleteRecipeAction}>
                      <input type="hidden" name="catalogId" value={r.squareCatalogItemId} />
                      <input type="hidden" name="inventoryId" value={r.inventoryItemId} />
                      <button
                        type="submit"
                        className="text-sm text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </form>
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
