import { cookieName, verifyAdminSession } from "@/lib/admin-auth";
import { getMediaObject, isSafeMediaKey } from "@/lib/media-storage";
import { noStoreHeaders } from "@/lib/cache";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const key = new URL(request.url).searchParams.get("key")?.trim() || "";
    if (!isSafeMediaKey(key)) {
      return NextResponse.json({ message: "Некорректный адрес файла." }, { status: 400, headers: noStoreHeaders });
    }
    if (key.startsWith("applications/") && !await verifyAdminSession(cookieFromRequest(request, cookieName))) {
      return NextResponse.json({ message: "Нужно войти в админку." }, { status: 401, headers: noStoreHeaders });
    }

    const object = await getMediaObject(key);
    return new Response(object.body, {
      headers: {
        "Content-Type": object.contentType,
        ...(object.contentLength ? { "Content-Length": String(object.contentLength) } : {}),
        "Cache-Control": key.startsWith("applications/") ? "private, no-store" : (object.cacheControl || "public, max-age=31536000, immutable"),
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch {
    return NextResponse.json({ message: "Файл не найден или хранилище недоступно." }, { status: 404, headers: noStoreHeaders });
  }
}

function cookieFromRequest(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  return cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${name}=`))?.slice(name.length + 1);
}
