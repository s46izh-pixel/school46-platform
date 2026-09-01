import { cookieName, verifyAdminSession } from "@/lib/admin-auth";
import { readAdminStore, updateAdminStore } from "@/lib/admin-store";
import type { ApplicationItem, EventItem } from "@/lib/types";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  if (!await verifyAdminSession(cookieFromRequest(request, cookieName))) {
    return NextResponse.json({ message: "Нужно войти в админку." }, { status: 401 });
  }

  const store = await readAdminStore();
  return NextResponse.json(store.applications);
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const applicationId = stringValue(body.applicationId) || `app-${Date.now()}`;
    const createdAt = stringValue(body.createdAt) || new Date().toISOString();
    const eventTitle = pickString(body, ["eventTitle", "contest", "Мероприятие"]) || "Мероприятие";

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
      files: normalizeFiles(body.files)
    };

    const store = await readAdminStore();
    await updateAdminStore({ applications: [application, ...store.applications] });

    return NextResponse.json(application, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Не удалось сохранить заявку." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    if (!await verifyAdminSession(cookieFromRequest(request, cookieName))) {
      return NextResponse.json({ message: "Нужно войти в админку." }, { status: 401 });
    }

    const body = await request.json() as Record<string, unknown>;
    const id = pickString(body, ["id", "applicationId"]);
    if (!id) return NextResponse.json({ message: "Не указана заявка." }, { status: 400 });

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
    return NextResponse.json(saved.applications);
  } catch {
    return NextResponse.json({ message: "Не удалось обновить заявку." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!await verifyAdminSession(cookieFromRequest(request, cookieName))) {
      return NextResponse.json({ message: "Нужно войти в админку." }, { status: 401 });
    }

    const id = new URL(request.url).searchParams.get("id")?.trim();
    if (!id) return NextResponse.json({ message: "Не указана заявка." }, { status: 400 });

    const store = await readAdminStore();
    const saved = await updateAdminStore({ applications: store.applications.filter((item) => item.id !== id && item.applicationId !== id) });
    return NextResponse.json(saved.applications);
  } catch {
    return NextResponse.json({ message: "Не удалось удалить заявку." }, { status: 500 });
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

function normalizeFiles(value: unknown): ApplicationItem["files"] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): NonNullable<ApplicationItem["files"]>[number] | null => {
      if (!item || typeof item !== "object") return null;
      const file = item as Record<string, unknown>;
      const name = stringValue(file.name);
      if (!name) return null;
      return {
        name,
        size: typeof file.size === "number" ? file.size : 0,
        type: stringValue(file.type),
        dataUrl: stringValue(file.dataUrl) || undefined
      };
    })
    .filter((item): item is NonNullable<ApplicationItem["files"]>[number] => item !== null);
}

function cookieFromRequest(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  return cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}
