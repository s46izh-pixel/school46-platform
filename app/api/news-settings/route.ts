import { shortApiCacheHeaders, ADMIN_REVALIDATE_SECONDS } from "@/lib/cache";
import { readAdminStore } from "@/lib/admin-store";
import type { NewsItem } from "@/lib/types";
import { NextResponse } from "next/server";

export const revalidate = ADMIN_REVALIDATE_SECONDS;

export async function GET() {
  try {
    const store = await readAdminStore();
    return NextResponse.json(
      { newsVisibility: store.newsVisibility, newsOverrides: publicNewsOverrides(store.newsOverrides) },
      { headers: shortApiCacheHeaders }
    );
  } catch {
    return NextResponse.json({ newsVisibility: {}, newsOverrides: {} }, { headers: shortApiCacheHeaders });
  }
}

function publicNewsOverrides(overrides: Record<string, NewsItem>) {
  return Object.fromEntries(
    Object.entries(overrides).map(([slug, item]) => [
      slug,
      {
        ...item,
        photo: typeof item.photo === "string" && item.photo.startsWith("data:image/") ? "" : item.photo
      }
    ])
  );
}
