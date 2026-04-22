import { and, eq, gte } from "drizzle-orm";
import { Resend } from "resend";
import { db, schema } from "@/db";
import { env } from "./env";
import { forecastAll, needsReorder, type ForecastRow } from "./forecast";
import { renderLowStockEmail } from "@/emails/LowStockEmail";

const ALERT_COOLDOWN_HOURS = 24;

export interface AlertResult {
  checked: number;
  flagged: number;
  sent: number;
  skippedCooldown: number;
}

export async function checkAndSendAlerts(): Promise<AlertResult> {
  const rows = await forecastAll();
  const flagged = rows.filter(needsReorder);
  const cooldownCutoff = new Date(Date.now() - ALERT_COOLDOWN_HOURS * 60 * 60 * 1000);

  const toSend: ForecastRow[] = [];
  let skipped = 0;

  for (const row of flagged) {
    const recent = await db
      .select({ id: schema.alertsSent.id })
      .from(schema.alertsSent)
      .where(
        and(
          eq(schema.alertsSent.inventoryItemId, row.id),
          eq(schema.alertsSent.kind, "low_stock"),
          gte(schema.alertsSent.sentAt, cooldownCutoff),
        ),
      )
      .limit(1);

    if (recent.length > 0) {
      skipped++;
      continue;
    }
    toSend.push(row);
  }

  if (toSend.length === 0) {
    return { checked: rows.length, flagged: flagged.length, sent: 0, skippedCooldown: skipped };
  }

  const resend = new Resend(env.RESEND_API_KEY);
  const { html, subject, text } = renderLowStockEmail(toSend);

  await resend.emails.send({
    from: env.ALERT_EMAIL_FROM,
    to: env.ALERT_EMAIL_TO,
    subject,
    html,
    text,
  });

  for (const row of toSend) {
    await db.insert(schema.alertsSent).values({
      inventoryItemId: row.id,
      kind: "low_stock",
    });
  }

  return {
    checked: rows.length,
    flagged: flagged.length,
    sent: toSend.length,
    skippedCooldown: skipped,
  };
}
