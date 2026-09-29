import { cookieName, verifyAdminSession } from "@/lib/admin-auth";
import { readAdminStore } from "@/lib/admin-store";
import { isMediaStorageConfigured, mediaFileUrl, uploadMediaObject } from "@/lib/media-storage";
import { noStoreHeaders } from "@/lib/cache";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const maxFileSize = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    if (!isMediaStorageConfigured()) {
      return NextResponse.json(
        { code: "media_storage_unconfigured", message: "Хранилище медиа пока не подключено." },
        { status: 503, headers: noStoreHeaders }
      );
    }

    const form = await request.formData();
    const file = form.get("file");
    const scope = text(form.get("scope"));
    if (!(file instanceof File) || !file.name) {
      return NextResponse.json({ message: "Файл не выбран." }, { status: 400, headers: noStoreHeaders });
    }
    if (file.size > maxFileSize) {
      return NextResponse.json({ message: "Файл слишком большой. Максимум 10 МБ." }, { status: 400, headers: noStoreHeaders });
    }

    if (scope === "events" || scope === "news") {
      if (!await verifyAdminSession(cookieFromRequest(request, cookieName))) {
        return NextResponse.json({ message: "Нужно войти в админку." }, { status: 401, headers: noStoreHeaders });
      }
      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ message: "Для обложки можно загрузить только изображение." }, { status: 400, headers: noStoreHeaders });
      }
    } else if (scope === "applications") {
      const fileCheck = await validateApplicationFile(form, file);
      if (!fileCheck.ok) {
        return NextResponse.json({ message: fileCheck.message }, { status: 400, headers: noStoreHeaders });
      }
    } else {
      return NextResponse.json({ message: "Неизвестный тип медиа." }, { status: 400, headers: noStoreHeaders });
    }

    const safeName = safeFileName(file.name, file.type);
    const key = objectKey(scope, form, safeName);
    const uploadedAt = new Date().toISOString();
    const deleteAfter = scope === "applications" ? addYears(uploadedAt, 1) : undefined;
    await uploadMediaObject({
      key,
      body: new Uint8Array(await file.arrayBuffer()),
      contentType: file.type || "application/octet-stream",
      fileName: safeName,
      publicMedia: scope !== "applications",
      metadata: scope === "applications" ? { uploadedAt, deleteAfter: deleteAfter ?? "" } : undefined
    });

    return NextResponse.json({
      name: safeName,
      size: file.size,
      type: file.type || "application/octet-stream",
      key,
      url: mediaFileUrl(key),
      uploadedAt,
      deleteAfter
    }, { status: 201, headers: noStoreHeaders });
  } catch {
    return NextResponse.json({ message: "Не удалось загрузить файл в хранилище." }, { status: 500, headers: noStoreHeaders });
  }
}

async function validateApplicationFile(form: FormData, file: File) {
  const eventId = text(form.get("eventId"));
  const slug = eventId.startsWith("manual-") ? eventId.slice("manual-".length) : "";
  const store = await readAdminStore();
  const eventPage = slug
    ? (store.eventPages as Array<Record<string, unknown>>).find((item) => text(item.slug) === slug)
    : undefined;
  if (eventPage?.allowFiles === false) return { ok: false as const, message: "Для этого мероприятия вложения отключены." };
  const allowed = parseAllowedFiles(text(eventPage?.allowedFiles));
  const extension = fileExtension(file.name);
  const acceptedImage = file.type.startsWith("image/") && allowed.some((item) => ["jpg", "jpeg", "png", "webp"].includes(item));
  if (!allowed.includes(extension) && !acceptedImage) {
    return { ok: false as const, message: `Файл "${file.name}" не подходит. Разрешены форматы: ${allowed.join(", ")}.` };
  }
  return { ok: true as const };
}

function objectKey(scope: string, form: FormData, fileName: string) {
  const unique = randomUUID();
  if (scope === "events") {
    return `events/${safePath(text(form.get("slug")) || "event")}/${safePath(text(form.get("variant")) || "cover")}-${unique}.${fileExtension(fileName)}`;
  }
  if (scope === "news") {
    return `news/${safePath(text(form.get("slug")) || "news")}/${safePath(text(form.get("variant")) || "image")}-${unique}.${fileExtension(fileName)}`;
  }
  return `applications/${safePath(text(form.get("eventId")) || "event")}/${safePath(text(form.get("applicationId")) || unique)}/${unique}-${fileName}`;
}

function parseAllowedFiles(value: string) {
  const items = (value || "pdf, docx, jpg, png, zip")
    .split(/[,;\s]+/)
    .map((item) => item.trim().replace(/^\./, "").toLowerCase().replace(/[^a-z0-9]/g, ""))
    .filter(Boolean);
  return Array.from(new Set(items.length ? items : ["pdf", "docx", "jpg", "png", "zip"]));
}

function safeFileName(name: string, mime: string) {
  const extension = fileExtension(name) || extensionFromMime(mime) || "file";
  const base = name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[а-яё]/g, (letter) => translit[letter] ?? "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || `file-${Date.now()}`;
  return `${base}.${extension}`;
}

function safePath(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "item";
}

function fileExtension(name: string) {
  return name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "";
}

function extensionFromMime(type: string) {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "application/pdf") return "pdf";
  if (type.includes("wordprocessingml")) return "docx";
  if (type.includes("zip")) return "zip";
  return "";
}

function text(value: FormDataEntryValue | unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cookieFromRequest(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  return cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${name}=`))?.slice(name.length + 1);
}

function addYears(value: string, years: number) {
  const date = new Date(value);
  date.setUTCFullYear(date.getUTCFullYear() + years);
  return date.toISOString();
}

const translit: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
  х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya"
};
