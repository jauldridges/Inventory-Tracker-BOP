import { db, schema } from "@/db";
import { env } from "@/lib/env";

export default async function SettingsPage() {
  const state = await db.select().from(schema.syncState).limit(1);
  const s = state[0];

  const checks = [
    { label: "DATABASE_URL", ok: !!process.env.DATABASE_URL },
    { label: "SQUARE_ACCESS_TOKEN", ok: !!process.env.SQUARE_ACCESS_TOKEN },
    { label: "SQUARE_LOCATION_ID", ok: !!process.env.SQUARE_LOCATION_ID },
    {
      label: "SQUARE_ENVIRONMENT",
      ok: !!process.env.SQUARE_ENVIRONMENT,
      value: process.env.SQUARE_ENVIRONMENT,
    },
    { label: "RESEND_API_KEY", ok: !!process.env.RESEND_API_KEY },
    {
      label: "ALERT_EMAIL_FROM",
      ok: !!process.env.ALERT_EMAIL_FROM,
      value: process.env.ALERT_EMAIL_FROM,
    },
    {
      label: "ALERT_EMAIL_TO",
      ok: !!process.env.ALERT_EMAIL_TO,
      value: process.env.ALERT_EMAIL_TO,
    },
    { label: "AUTH_SECRET", ok: !!process.env.AUTH_SECRET },
    { label: "CRON_SECRET", ok: !!process.env.CRON_SECRET },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section className="border rounded bg-white p-4 space-y-2">
        <h2 className="font-medium">Environment</h2>
        <p className="text-sm text-neutral-600">
          These are set via environment variables in your hosting provider (e.g. Vercel).
          This page just confirms they're visible at runtime.
        </p>
        <table className="w-full text-sm mt-3">
          <tbody>
            {checks.map((c) => (
              <tr key={c.label} className="border-t">
                <td className="py-2 pr-4 font-mono text-xs">{c.label}</td>
                <td className="py-2">
                  {c.ok ? (
                    <span className="text-green-700">
                      set{c.value ? ` — ${c.value}` : ""}
                    </span>
                  ) : (
                    <span className="text-red-700">missing</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="border rounded bg-white p-4 space-y-2">
        <h2 className="font-medium">Sync status</h2>
        <p className="text-sm text-neutral-600">
          Cron runs every 15 minutes ({`/api/cron/sync`}) to pull new completed orders
          from Square. Catalog is refreshed daily at 06:00 UTC.
        </p>
        <dl className="text-sm mt-2">
          <div className="flex gap-4 py-1">
            <dt className="w-48 text-neutral-600">Last order sync</dt>
            <dd className="tabular-nums">
              {s?.lastOrderSyncAt ? new Date(s.lastOrderSyncAt).toLocaleString() : "never"}
            </dd>
          </div>
          <div className="flex gap-4 py-1">
            <dt className="w-48 text-neutral-600">Last catalog sync</dt>
            <dd className="tabular-nums">
              {s?.lastCatalogSyncAt
                ? new Date(s.lastCatalogSyncAt).toLocaleString()
                : "never"}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
