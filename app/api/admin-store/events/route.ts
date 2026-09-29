import { cookieName, verifyAdminSession } from "@/lib/admin-auth";
import { mutateAdminStore } from "@/lib/admin-store";
import { noStoreHeaders } from "@/lib/cache";
import { NextResponse } from "next/server";

type EventPageRecord = Record<string, unknown>;
type EventPageOperation =
  | { action: "copy"; slug?: string }
  | { action: "delete"; slug?: string }
  | { action: "toggle"; slug?: string }
  | { action: "upsert"; eventPage?: EventPageRecord; sourceSlug?: string };

export async function POST(request: Request) {
  if (!await verifyAdminSession(cookieFromRequest(request, cookieName))) {
    return NextResponse.json({ message: "Нужно войти в админку." }, { status: 401, headers: noStoreHeaders });
  }

  try {
    const operation = await request.json() as EventPageOperation;
    let changedEvent: EventPageRecord | undefined;

    const saved = await mutateAdminStore((current) => {
      const pages = (current.eventPages as EventPageRecord[]).map((item) => ({ ...item }));

      if (operation.action === "copy") {
        const sourceSlug = text(operation.slug);
        const source = pages.find((item) => text(item.slug) === sourceSlug);
        if (!source) throw new EventPageOperationError("Исходное мероприятие не найдено.", 404);

        const copySlug = uniqueCopySlug(sourceSlug || "event", pages);
        changedEvent = {
          ...source,
          slug: copySlug,
          title: `Копия: ${text(source.title) || "Без названия"}`,
          published: false
        };
        return { ...current, eventPages: [...pages, changedEvent] };
      }

      if (operation.action === "upsert") {
        if (!operation.eventPage || typeof operation.eventPage !== "object" || Array.isArray(operation.eventPage)) {
          throw new EventPageOperationError("Данные мероприятия не переданы.", 400);
        }
        const eventSlug = text(operation.eventPage.slug);
        const sourceSlug = text(operation.sourceSlug);
        if (!eventSlug) throw new EventPageOperationError("Укажите адрес страницы мероприятия.", 400);

        const collision = pages.some((item) => text(item.slug) === eventSlug && text(item.slug) !== sourceSlug);
        if (collision) throw new EventPageOperationError("Мероприятие с таким адресом уже существует. Измените короткий адрес.", 409);

        changedEvent = { ...operation.eventPage, slug: eventSlug };
        const currentIndex = pages.findIndex((item) => text(item.slug) === (sourceSlug || eventSlug));
        if (currentIndex === -1) return { ...current, eventPages: [...pages, changedEvent] };
        const nextPages = [...pages];
        nextPages[currentIndex] = changedEvent;
        return { ...current, eventPages: nextPages };
      }

      const slug = text(operation.slug);
      const index = pages.findIndex((item) => text(item.slug) === slug);
      if (index === -1) throw new EventPageOperationError("Мероприятие не найдено.", 404);

      if (operation.action === "delete") {
        return { ...current, eventPages: pages.filter((_, pageIndex) => pageIndex !== index) };
      }

      if (operation.action === "toggle") {
        changedEvent = { ...pages[index], published: pages[index].published === false };
        const nextPages = [...pages];
        nextPages[index] = changedEvent;
        return { ...current, eventPages: nextPages };
      }

      throw new EventPageOperationError("Неизвестная операция.", 400);
    });

    return NextResponse.json({ eventPages: saved.eventPages, eventPage: changedEvent }, { headers: noStoreHeaders });
  } catch (error) {
    const status = error instanceof EventPageOperationError ? error.status : 500;
    const message = error instanceof EventPageOperationError ? error.message : "Не удалось изменить мероприятие.";
    return NextResponse.json({ message }, { status, headers: noStoreHeaders });
  }
}

class EventPageOperationError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function uniqueCopySlug(sourceSlug: string, pages: EventPageRecord[]) {
  const existing = new Set(pages.map((item) => text(item.slug)));
  const base = `${sourceSlug}-copy-${Date.now()}`;
  let candidate = base;
  let suffix = 2;
  while (existing.has(candidate)) candidate = `${base}-${suffix++}`;
  return candidate;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cookieFromRequest(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  return cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}
