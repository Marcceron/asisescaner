import { NextResponse } from "next/server";
import { ADMIN_COOKIE, expectedAdminToken, validPassword } from "@/server/admin-auth";

export async function POST(request: Request) {
  const { password } = await request.json() as { password?: string };
  const token = expectedAdminToken();
  if (!token) return Response.json({ error: "Configura ASIS_ADMIN_PASSWORD y ASIS_SESSION_SECRET en el servidor" }, { status: 503 });
  if (!password || !validPassword(password)) return Response.json({ error: "Contraseña incorrecta" }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, token, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 8 });
  return response;
}
