import { shortApiCacheHeaders, ADMIN_REVALIDATE_SECONDS } from "@/lib/cache";
import { defaultHomeSectionSettings } from "@/lib/home-sections";
import { readAdminStore } from "@/lib/admin-store";
import { NextResponse } from "next/server";

export const revalidate = ADMIN_REVALIDATE_SECONDS;

export async function GET() {
  try {
    const store = await readAdminStore();
    return NextResponse.json(
      { homeSections: { ...defaultHomeSectionSettings(), ...store.homeSections } },
      { headers: shortApiCacheHeaders }
    );
  } catch {
    return NextResponse.json({ homeSections: defaultHomeSectionSettings() }, { headers: shortApiCacheHeaders });
  }
}
