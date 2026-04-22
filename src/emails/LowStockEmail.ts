import type { ForecastRow } from "@/lib/forecast";

function fmtDays(n: number): string {
  if (!Number.isFinite(n)) return "∞";
  return n.toFixed(1);
}

function fmtNumber(n: number): string {
  return Number.isInteger(n) ? n.toString() : n.toFixed(2);
}

export function renderLowStockEmail(rows: ForecastRow[]): {
  subject: string;
  html: string;
  text: string;
} {
  const urgent = rows.filter((r) => r.status === "reorder");
  const warn = rows.filter((r) => r.status === "warning");

  const subject =
    urgent.length > 0
      ? `🚨 Reorder now: ${urgent.map((r) => r.name).join(", ")}`
      : `⚠️ Low stock warning: ${warn.map((r) => r.name).join(", ")}`;

  const rowsHtml = rows
    .map((r) => {
      const color =
        r.status === "reorder" ? "#b91c1c" : r.status === "warning" ? "#b45309" : "#15803d";
      const reorderLink = r.reorderUrl
        ? `<a href="${r.reorderUrl}" style="color:#2563eb;text-decoration:underline">Reorder</a>`
        : "";
      return `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600">${r.name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:${color};text-transform:uppercase;font-size:12px">${r.status}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${fmtNumber(r.currentStock)} ${r.unit}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${fmtNumber(r.avgDailyUse)}/day</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${fmtDays(r.daysOfSupply)} days</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${reorderLink}</td>
        </tr>
      `;
    })
    .join("");

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:720px;margin:0 auto;padding:24px">
      <h2 style="margin:0 0 8px">Inventory alert</h2>
      <p style="margin:0 0 16px;color:#4b5563">
        Based on usage over the last 14 days, the following items need attention.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead>
          <tr style="background:#f9fafb;text-align:left">
            <th style="padding:8px 12px;border-bottom:1px solid #e5e7eb">Item</th>
            <th style="padding:8px 12px;border-bottom:1px solid #e5e7eb">Status</th>
            <th style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">On hand</th>
            <th style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">Avg use</th>
            <th style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">Days left</th>
            <th style="padding:8px 12px;border-bottom:1px solid #e5e7eb"></th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>
  `;

  const textLines = rows.map(
    (r) =>
      `${r.status.toUpperCase()} - ${r.name}: ${fmtNumber(r.currentStock)} ${r.unit} on hand, ${fmtNumber(r.avgDailyUse)}/day avg, ~${fmtDays(r.daysOfSupply)} days left`,
  );
  const text = ["Inventory alert", "", ...textLines].join("\n");

  return { subject, html, text };
}
