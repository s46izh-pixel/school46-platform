import { cookieName, verifyAdminSession } from "@/lib/admin-auth";
import { readAdminStore, updateAdminStore } from "@/lib/admin-store";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    return NextResponse.json(publicAdminStore(await readAdminStore()));
  } catch {
    return NextResponse.json({ eventPages: [], calendarTemplateVisibility: {}, newsVisibility: {}, newsOverrides: {}, homeSections: {} });
  }
}

export async function PATCH(request: Request) {
  try {
    if (!await verifyAdminSession(cookieFromRequest(request, cookieName))) {
      return NextResponse.json({ message: "Нужно войти в админку." }, { status: 401 });
    }
    const patch = await request.json();
    delete patch.adminPasswordHash;
    return NextResponse.json(publicAdminStore(await updateAdminStore(patch)));
  } catch {
    return NextResponse.json({ message: "Не удалось сохранить настройки. Попробуйте уменьшить изображение или повторить позже." }, { status: 500 });
  }
}

function publicAdminStore(store: Awaited<ReturnType<typeof readAdminStore>>) {
  const { adminPasswordHash: _adminPasswordHash, applications: _applications, ...publicStore } = store;
  return publicStore;
}

function cookieFromRequest(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  return cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}
