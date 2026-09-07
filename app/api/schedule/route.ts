import { apiCacheHeaders, DATA_REVALIDATE_SECONDS } from "@/lib/cache";
import { getDataset, getScheduleChanges } from "@/lib/sheets";
import { NextResponse } from "next/server";

export const revalidate = DATA_REVALIDATE_SECONDS;

export async function GET() {
  const [lessons, bells, changes] = await Promise.all([getDataset("schedule"), getDataset("bells"), getScheduleChanges()]);
  return NextResponse.json({ lessons, bells, changes }, { headers: apiCacheHeaders });
}
