import { cookieName, verifyAdminSession } from "@/lib/admin-auth";
import { readAdminStore, updateAdminStore } from "@/lib/admin-store";
import { noStoreHeaders } from "@/lib/cache";
import type { ApplicationItem, EventItem } from "@/lib/types";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  if (!await verifyAdminSession(cookieFromRequest(request, cookieName))) {
    return NextResponse.json({ message: "Нужно войти в админку." }, { status: 401, headers: noStoreHeaders });
  }

  const store = await readAdminStore();
  return NextResponse.json(store.applications, { headers: noStoreHeaders });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const applicationId = stringValue(body.applicationId) || `app-${Date.now()}`;
    const createdAt = stringValue(body.createdAt) || new Date().toISOString();
    const eventTitle = pickString(body, ["eventTitle", "contest", "Мероприятие"]) || "Мероприятие";
    const store = await readAdminStore();
    const fileRules = fileRulesForRequest(body, store.eventPages as Array<Record<string, unknown>>);
    const fileCheck = validateFiles(body.files, fileRules);
    if (!fileCheck.ok) {
      return NextResponse.json({ message: fileCheck.message }, { status: 400, headers: noStoreHeaders });
    }

    const application: ApplicationItem = {
      id: applicationId,
      applicationId,
      eventId: pickString(body, ["eventId"]),
      eventTitle,
      eventType: eventTypeValue(body.eventType),
      createdAt,
      contest: pickString(body, ["contest", "eventTitle"]) || eventTitle,
      className: pickString(body, ["className", "класс", "Класс"]),
      student: pickString(body, ["student", "ФИО участника", "фио участника"]),
      mentor: pickString(body, ["mentor", "педагог", "Педагог", "ФИО руководителя"]),
      nomination: pickString(body, ["nomination", "номинация", "Номинация"]),
      contact: pickString(body, ["contact", "контакт", "Контакт"]),
      workUrl: pickString(body, ["workUrl", "ссылка на работу", "Ссылка на работу"]),
      comment: pickString(body, ["comment", "комментарий", "Комментарий"]),
      consent: Boolean(body.consent),
      status: "new",
      files: normalizeFiles(body.files, fileRules)
    };

    await updateAdminStore({ applications: [application, ...store.applications] });

    return NextResponse.json(application, { status: 201, headers: noStoreHeaders });
  } catch {
    return NextResponse.json({ message: "Не удалось сохранить заявку." }, { status: 500, headers: noStoreHeaders });
  }
}

export async function PATCH(request: Request) {
  try {
    if (!await verifyAdminSession(cookieFromRequest(request, cookieName))) {
      return NextResponse.json({ message: "Нужно войти в админку." }, { status: 401, headers: noStoreHeaders });
    }

    const body = await request.json() as Record<string, unknown>;
    const id = pickString(body, ["id", "applicationId"]);
    if (!id) return NextResponse.json({ message: "Не указана заявка." }, { status: 400, headers: noStoreHeaders });

    const store = await readAdminStore();
    const nextApplications = store.applications.map((item) => {
      if (item.id !== id && item.applicationId !== id) return item;
      return {
        ...item,
        status: applicationStatusValue(body.status) ?? item.status,
        student: pickString(body, ["student"]) || item.student,
        className: pickString(body, ["className"]) || item.className,
        mentor: pickString(body, ["mentor"]) || item.mentor,
        nomination: pickString(body, ["nomination"]) || item.nomination,
        contact: pickString(body, ["contact"]) || item.contact,
        workUrl: pickString(body, ["workUrl"]) || item.workUrl,
        comment: pickString(body, ["comment"]) || item.comment
      };
    });

    const saved = await updateAdminStore({ applications: nextApplications });
    return NextResponse.json(saved.applications, { headers: noStoreHeaders });
  } catch {
    return NextResponse.json({ message: "Не удалось обновить заявку." }, { status: 500, headers: noStoreHeaders });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!await verifyAdminSession(cookieFromRequest(request, cookieName))) {
      return NextResponse.json({ message: "Нужно войти в админку." }, { status: 401, headers: noStoreHeaders });
    }

    const id = new URL(request.url).searchParams.get("id")?.trim();
    if (!id) return NextResponse.json({ message: "Не указана заявка." }, { status: 400, headers: noStoreHeaders });

    const store = await readAdminStore();
    const saved = await updateAdminStore({ applications: store.applications.filter((item) => item.id !== id && item.applicationId !== id) });
    return NextResponse.json(saved.applications, { headers: noStoreHeaders });
  } catch {
    return NextResponse.json({ message: "Не удалось удалить заявку." }, { status: 500, headers: noStoreHeaders });
  }
}

function eventTypeValue(value: unknown): EventItem["type"] {
  return value === "contest" || value === "action" || value === "event" ? value : "event";
}

function applicationStatusValue(value: unknown): ApplicationItem["status"] | undefined {
  if (value === "new" || value === "accepted" || value === "revision" || value === "rejected" || value === "sent") return value;
  return undefined;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function pickString(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = stringValue(source[key]);
    if (value) return value;
  }
  return "";
}

type FileRules = {
  allowFiles: boolean;
  allowedFiles: string[];
};

function fileRulesForRequest(body: Record<string, unknown>, eventPages: Array<Record<string, unknown>>): FileRules {
  const eventId = pickString(body, ["eventId"]);
  const slug = eventId.startsWith("manual-") ? eventId.slice("manual-".length) : "";
  const eventPage = slug ? eventPages.find((item) => stringValue(item.slug) === slug) : undefined;
  return {
    allowFiles: eventPage?.allowFiles !== false,
    allowedFiles: parseAllowedFiles(stringValue(eventPage?.allowedFiles))
  };
}

function parseAllowedFiles(value: string) {
  const values = (value || "pdf, docx, jpg, png, zip")
    .split(/[,;\s]+/)
    .map((item) => item.trim().replace(/^\./, "").toLowerCase().replace(/[^a-z0-9]/g, ""))
    .filter(Boolean);
  return Array.from(new Set(values.length ? values : ["pdf", "docx", "jpg", "png", "zip"]));
}

function validateFiles(value: unknown, rules: FileRules) {
  if (!Array.isArray(value) || !value.length) return { ok: true as const };
  if (!rules.allowFiles) return { ok: false as const, message: "Для этого мероприятия вложения отключены." };
  const maxFiles = 5;
  const maxFileSize = 10 * 1024 * 1024;
  if (value.length > maxFiles) return { ok: false as const, message: `Можно прикрепить не больше ${maxFiles} файлов.` };

  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const file = item as Record<string, unknown>;
    const name = stringValue(file.name);
    if (!name) continue;
    if (!isAllowedFile(name, stringValue(file.type), rules.allowedFiles)) {
      return { ok: false as const, message: `Файл "${name}" не подходит. Разрешены форматы: ${rules.allowedFiles.join(", ")}.` };
    }
    if (typeof file.size === "number" && file.size > maxFileSize) {
      return { ok: false as const, message: `Файл "${name}" слишком большой. Максимум 10 МБ.` };
    }
  }

  return { ok: true as const };
}

function normalizeFiles(value: unknown, rules: FileRules): ApplicationItem["files"] {
  if (!Array.isArray(value)) return [];
  const maxFiles = 5;
  const maxDataUrlLength = 1_600_000;
  return value
    .slice(0, maxFiles)
    .map((item): NonNullable<ApplicationItem["files"]>[number] | null => {
      if (!item || typeof item !== "object") return null;
      const file = item as Record<string, unknown>;
      const name = stringValue(file.name);
      if (!name) return null;
      if (!rules.allowFiles || !isAllowedFile(name, stringValue(file.type), rules.allowedFiles)) return null;
      const dataUrl = stringValue(file.dataUrl);
      return {
        name: safeFileName(name),
        size: typeof file.size === "number" ? file.size : 0,
        type: stringValue(file.type),
        dataUrl: dataUrl.length <= maxDataUrlLength ? dataUrl || undefined : undefined
      };
    })
    .filter((item): item is NonNullable<ApplicationItem["files"]>[number] => item !== null);
}

function isAllowedFile(name: string, type: string, allowedFiles: string[]) {
  const extension = name.split(".").pop()?.toLowerCase() || "";
  if (allowedFiles.includes(extension)) return true;
  return type.startsWith("image/") && allowedFiles.some((item) => ["jpg", "jpeg", "png", "webp"].includes(item));
}

function safeFileName(name: string) {
  const extension = name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "file";
  const base = name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[а-яё]/g, (letter) => translit[letter] ?? "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || `file-${Date.now()}`;
  return `${base}.${extension}`;
}

function cookieFromRequest(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  return cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

const translit: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "c",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya"
};
