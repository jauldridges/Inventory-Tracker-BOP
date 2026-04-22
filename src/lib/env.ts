import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  SQUARE_ACCESS_TOKEN: z.string().min(1),
  SQUARE_LOCATION_ID: z.string().min(1),
  SQUARE_ENVIRONMENT: z.enum(["production", "sandbox"]).default("sandbox"),
  RESEND_API_KEY: z.string().min(1),
  ALERT_EMAIL_FROM: z.string().email(),
  ALERT_EMAIL_TO: z.string().email(),
  APP_PASSWORD: z.string().min(6),
  AUTH_SECRET: z.string().min(16),
  CRON_SECRET: z.string().min(16),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // Don't crash at import time — let individual callers fail if they need a specific var.
  // This keeps `next build` working in CI without live secrets.
  console.warn(
    "[env] Missing or invalid environment variables:",
    parsed.error.flatten().fieldErrors,
  );
}

export const env = (parsed.success
  ? parsed.data
  : (process.env as unknown as z.infer<typeof schema>));
