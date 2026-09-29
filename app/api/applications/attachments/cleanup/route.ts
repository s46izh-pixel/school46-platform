import { cookieName, verifyAdminSession } from "@/lib/admin-auth";
import { mutateAdminStore, readAdminStore } from "@/lib/admin-store";
import { noStoreHeaders } from "@/lib/cache";
import { deleteMediaObject } from "@/lib/media-storage";
import type { ApplicationAttachment } from "@/lib/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!await verifyAdminSession(cookieFromRequest(request, cookieName))) {
      return NextResponse.json({ message: "Нужно войти в админку." }, { status: 401, headers: noStoreHeaders });
    }

    const now = new Date();
    const store = await readAdminStore();
    const expiredKeys = store.applications.flatMap((application) =>
      (application.files ?? [])
        .filter((file) => isExpired(file, application.createdAt, now))
        .map((file) => file.key)
        .filter((key): key is string => Boolean(key))
    );

    await Promise.all(Array.from(new Set(expiredKeys)).map((key) => deleteMediaObject(key)));

    let deleted = 0;
    if (store.applications.some((application) => (application.files ?? []).some((file) => isExpired(file, application.createdAt, now)))) {
      await mutateAdminStore((current) => ({
        applications: current.applications.map((application) => {
          let removed = 0;
          const files = (application.files ?? []).filter((file) => {
            const expired = isExpired(file, application.createdAt, now);
            if (expired) {
              deleted += 1;
              removed += 1;
            }
            return !expired;
          });
          return removed ? { ...application, files, updatedAt: now.toISOString() } : application;
        })
      }));
    }

    return NextResponse.json({ deleted }, { headers: noStoreHeaders });
  } catch {
    return NextResponse.json(
      { message: "Не удалось удалить просроченные вложения. Данные заявок не изменены." },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

function isExpired(file: ApplicationAttachment, applicationCreatedAt: string, now: Date) {
  const explicit = validDate(file.deleteAfter);
  const fallback = validDate(file.uploadedAt) ?? validDate(applicationCreatedAt);
  if (explicit) return explicit <= now;
  if (!fallback) return false;
  const expires = new Date(fallback);
  expires.setUTCFullYear(expires.getUTCFullYear() + 1);
  return expires <= now;
}

function validDate(value: string | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function cookieFromRequest(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  return cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${name}=`))?.slice(name.length + 1);
}
