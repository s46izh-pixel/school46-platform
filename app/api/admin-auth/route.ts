import { cookieName, createAdminSessionValue, createPasswordHash, sessionMaxAge, verifyAdminPassword, verifyAdminSession } from "@/lib/admin-auth";
import { updateAdminStore } from "@/lib/admin-store";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = cookieFromRequest(request, cookieName);
  return NextResponse.json({ authenticated: await verifyAdminSession(session) });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { action?: string; password?: string; currentPassword?: string; newPassword?: string };

    if (body.action === "change-password") {
      const session = cookieFromRequest(request, cookieName);
      const authenticated = await verifyAdminSession(session);
      const currentPasswordValid = body.currentPassword ? await verifyAdminPassword(body.currentPassword) : false;
      const newPassword = body.newPassword?.trim() ?? "";
      if (!authenticated || !currentPasswordValid) {
        return NextResponse.json({ message: "Текущий пароль указан неверно." }, { status: 403 });
      }
      if (newPassword.length < 6) {
        return NextResponse.json({ message: "Новый пароль должен быть не короче 6 символов." }, { status: 400 });
      }
      await updateAdminStore({ adminPasswordHash: createPasswordHash(newPassword) });
      const response = NextResponse.json({ ok: true });
      response.cookies.set(cookieName, await createAdminSessionValue(), cookieOptions());
      return response;
    }

    const valid = body.password ? await verifyAdminPassword(body.password) : false;
    if (!valid) return NextResponse.json({ message: "Неверный пароль." }, { status: 403 });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(cookieName, await createAdminSessionValue(), cookieOptions());
    return response;
  } catch {
    return NextResponse.json({ message: "Не удалось выполнить вход." }, { status: 500 });
  }
}

function cookieFromRequest(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  return cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function cookieOptions() {
  return {
    httpOnly: true,
    maxAge: sessionMaxAge,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production"
  };
}
