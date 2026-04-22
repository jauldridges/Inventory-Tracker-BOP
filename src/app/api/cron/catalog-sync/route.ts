import { NextResponse } from "next/server";
import { syncSquareCatalog } from "@/lib/sync";
import { isAuthorizedCron } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await syncSquareCatalog();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/catalog-sync] failed", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
