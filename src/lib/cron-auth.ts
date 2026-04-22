import { env } from "./env";

/**
 * Vercel Cron sends Authorization: Bearer <CRON_SECRET>. We also accept
 * a matching x-cron-secret header for manual curl testing.
 */
export function isAuthorizedCron(req: Request): boolean {
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${env.CRON_SECRET}`) return true;
  if (req.headers.get("x-cron-secret") === env.CRON_SECRET) return true;
  return false;
}
