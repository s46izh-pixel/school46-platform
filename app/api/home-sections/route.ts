import { noStoreHeaders } from "@/lib/cache";
import { defaultHomeSectionSettings } from "@/lib/home-sections";
import { readAdminStore } from "@/lib/admin-store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const store = await readAdminStore();
    return NextResponse.json(
      { homeSections: { ...defaultHomeSectionSettings(), ...store.homeSections } },
      { headers: noStoreHeaders }
    );
  } catch {
    return NextResponse.json({ homeSections: defaultHomeSectionSettings() }, { headers: noStoreHeaders });
  }
}
