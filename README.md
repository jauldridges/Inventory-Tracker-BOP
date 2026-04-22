# Inventory Tracker BOP

A small cloud-hosted web app that tracks shop consumables (cups, lids, sleeves,
straws, etc.) by decrementing local stock every time Square reports a sale, and
emails you when any item's projected days-of-supply falls below its lead time
plus a safety buffer — so you get alerted *before* you run out, not after.

## How it works

1. Square's Orders API is polled every 15 minutes (Vercel Cron).
2. Each completed-order line item is mapped to one or more consumables via
   recipes you define in the dashboard (e.g. `12oz Latte → 1× 12oz cup + 1× 12oz lid`).
3. Stock is decremented and logged to an append-only `consumption_log`.
4. A rolling 14-day average gives per-item daily usage.
5. If `days_of_supply < reorder_lead_days + safety_stock_days`, an email goes
   out via Resend (with a 24h cooldown per item).

## Stack

- **Next.js 15 (App Router)** + TypeScript
- **Postgres** (via `@neondatabase/serverless` — designed for Neon, works with
  any Postgres)
- **Drizzle ORM**
- **Square Node SDK** (`square`)
- **Resend** for transactional email
- **Vercel** for hosting + cron

## Setup

1. Copy `.env.example` to `.env.local` and fill in the values.
2. Install deps: `pnpm install` (or npm/yarn).
3. Push the schema to your DB: `pnpm db:push`.
4. Run the dev server: `pnpm dev` → http://localhost:3000

### Getting the required credentials

- **Square**: create a Personal Access Token in the Square Developer Dashboard.
  Start with the sandbox (`SQUARE_ENVIRONMENT=sandbox`). You also need the
  `SQUARE_LOCATION_ID` for the shop.
- **Resend**: sign up, verify a sender domain, create an API key. Set
  `ALERT_EMAIL_FROM` to a verified address on that domain.
- **CRON_SECRET / AUTH_SECRET**: any long random string (e.g.
  `openssl rand -base64 32`).
- **APP_PASSWORD**: the password you'll use to sign in to the dashboard.

## First-run walkthrough

1. Sign in at `/login` with your `APP_PASSWORD`.
2. Go to **Settings** and confirm all env vars are green.
3. Go to **Recipes** → **Sync Square catalog**. All your Square items appear.
4. Go to **Inventory** → add your consumables (cups, lids…) with initial stock,
   lead time, and safety days.
5. Back on **Recipes**, map each Square item to the consumables it uses.
6. Click **Sync Square now** on the overview page (or wait for cron). Stock
   starts decrementing as sales come in, and alerts fire when projected supply
   drops below your threshold.

## Deployment (Vercel)

1. Push this repo to GitHub.
2. Import into Vercel, connect to your Neon Postgres (or set `DATABASE_URL`).
3. Add all env vars from `.env.example`.
4. Deploy. `vercel.json` registers the two cron jobs automatically; Vercel
   signs cron requests with `Authorization: Bearer $CRON_SECRET` so no extra
   wiring is needed.

## Manual cron testing

```bash
curl -H "x-cron-secret: $CRON_SECRET" https://your-app.vercel.app/api/cron/sync
```

## Notes

- First order sync pulls the last 24 hours. After that, the `sync_state` table
  tracks the high-water mark.
- The `consumption_log` has a unique index on
  `(order_id, line_item_uid, inventory_item_id)`, so re-running the cron is
  safe — duplicate inserts are dropped.
- Line items whose `catalog_object_id` isn't mapped in **Recipes** are silently
  skipped and reported in the cron response as `unmappedCatalogObjectIds`.
- Forecast window is 14 days. With very low-volume items, the "days of supply"
  number will be noisy — adjust `safety_stock_days` up if needed.
