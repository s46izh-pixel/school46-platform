import { shortApiCacheHeaders, ADMIN_REVALIDATE_SECONDS } from "@/lib/cache";
import { readAdminStore } from "@/lib/admin-store";
import { NextResponse } from "next/server";

export const revalidate = ADMIN_REVALIDATE_SECONDS;

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  try {
    const slug = decodeURIComponent(params.slug);
    const store = await readAdminStore();
    const event = store.eventPages.find((item) => {
      if (!item || typeof item !== "object") return false;
      return (item as Record<string, unknown>).slug === slug;
    });
    if (!event) return NextResponse.json({ message: "Мероприятие не найдено." }, { status: 404, headers: shortApiCacheHeaders });
    return NextResponse.json(event, { headers: shortApiCacheHeaders });
  } catch {
    return NextResponse.json({ message: "Не удалось загрузить мероприятие." }, { status: 500, headers: shortApiCacheHeaders });
  }
}
