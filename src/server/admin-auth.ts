import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "asis_admin_session";

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function expectedAdminToken() {
  const password = process.env.ASIS_ADMIN_PASSWORD;
  const secret = process.env.ASIS_SESSION_SECRET;
  if (!password || !secret) return null;
  return digest(`${password}:${secret}`);
}

export function validPassword(value: string) {
  const expected = process.env.ASIS_ADMIN_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(digest(value));
  const b = Buffer.from(digest(expected));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function validAdminToken(value?: string) {
  const expected = expectedAdminToken();
  if (!expected || !value) return false;
  const a = Buffer.from(value); const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
