import { shortApiCacheHeaders, ADMIN_REVALIDATE_SECONDS } from "@/lib/cache";
import { readAdminStore } from "@/lib/admin-store";
import { NextResponse } from "next/server";

export const revalidate = ADMIN_REVALIDATE_SECONDS;

export async function GET() {
  try {
    const store = await readAdminStore();
    return NextResponse.json(
      {
        eventPages: store.eventPages.map(toPublicEventSummary)
      },
      { headers: shortApiCacheHeaders }
    );
  } catch {
    return NextResponse.json({ eventPages: [] }, { headers: shortApiCacheHeaders });
  }
}

function toPublicEventSummary(item: unknown) {
  if (!item || typeof item !== "object") return item;
  const event = item as Record<string, unknown>;
  return {
    title: event.title,
    category: event.category,
    startDate: event.startDate,
    endDate: event.endDate,
    time: event.time,
    place: event.place,
    classes: event.classes,
    owner: event.owner,
    status: event.status,
    slug: event.slug,
    cover: event.cover,
    coverWide: event.coverWide,
    description: event.description,
    acceptApplications: event.acceptApplications,
    deadline: event.deadline,
    applicationFields: event.applicationFields,
    applicationButton: event.applicationButton,
    published: event.published,
    autoHideDate: event.autoHideDate
  };
}
