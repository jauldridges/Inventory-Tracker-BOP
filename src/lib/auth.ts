import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { env } from "./env";

const COOKIE_NAME = "itb_session";
const ONE_WEEK = 60 * 60 * 24 * 7;

function sign(value: string): string {
  return createHmac("sha256", env.AUTH_SECRET).update(value).digest("hex");
}

function makeToken(): string {
  const issuedAt = Date.now().toString();
  const sig = sign(issuedAt);
  return `${issuedAt}.${sig}`;
}

function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  const [issuedAt, sig] = token.split(".");
  if (!issuedAt || !sig) return false;
  const expected = sign(issuedAt);
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;
  if (!timingSafeEqual(a, b)) return false;
  // 7-day expiry
  const age = Date.now() - Number.parseInt(issuedAt, 10);
  return age >= 0 && age < ONE_WEEK * 1000;
}

export async function isSignedIn(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  return verifyToken(token);
}

export async function signIn(password: string): Promise<boolean> {
  const a = Buffer.from(password);
  const b = Buffer.from(env.APP_PASSWORD);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const jar = await cookies();
  jar.set(COOKIE_NAME, makeToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ONE_WEEK,
  });
  return true;
}

export async function signOut() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}
