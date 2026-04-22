import Link from "next/link";
import { forecastAll, type Status } from "@/lib/forecast";
import { syncSquareOrders } from "@/lib/sync";
import { revalidatePath } from "next/cache";

const statusStyles: Record<Status, string> = {
  ok: "bg-green-100 text-green-800",
  warning: "bg-amber-100 text-amber-800",
  reorder: "bg-red-100 text-red-800",
};

function fmt(n: number, digits = 1) {
  if (!Number.isFinite(n)) return "∞";
  return n.toFixed(digits);
}

async function syncNowAction() {
  "use server";
  await syncSquareOrders();
  revalidatePath("/");
}

export default async function OverviewPage() {
  const rows = await forecastAll();
  const urgent = rows.filter((r) => r.status !== "ok").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Overview</h1>
          <p className="text-sm text-neutral-600">
            {urgent === 0
              ? "Everything's above its reorder threshold."
              : `${urgent} item${urgent === 1 ? "" : "s"} need attention.`}
          </p>
        </div>
        <form action={syncNowAction}>
          <button
            type="submit"
            className="bg-black text-white rounded px-3 py-2 text-sm hover:bg-neutral-800"
          >
            Sync Square now
          </button>
        </form>
      </div>

      {rows.length === 0 ? (
        <div className="border rounded bg-white p-8 text-center text-neutral-600">
          <p className="mb-3">No inventory items yet.</p>
          <Link
            href="/inventory"
            className="inline-block bg-black text-white rounded px-3 py-2 text-sm"
          >
            Add your first item
          </Link>
        </div>
      ) : (
        <div className="border rounded bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left">
              <tr>
                <th className="px-4 py-2">Item</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">On hand</th>
                <th className="px-4 py-2 text-right">Avg use (14d)</th>
                <th className="px-4 py-2 text-right">Days of supply</th>
                <th className="px-4 py-2 text-right">Reorder at</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs uppercase tracking-wide ${statusStyles[r.status]}`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {fmt(r.currentStock, 0)} {r.unit}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {fmt(r.avgDailyUse, 1)} / day
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {fmt(r.daysOfSupply, 1)} days
                  </td>
                  <td className="px-4 py-3 text-right text-neutral-600 tabular-nums">
                    &lt; {r.reorderThresholdDays} days
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
