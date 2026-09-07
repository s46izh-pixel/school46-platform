import { apiCacheHeaders, DATA_REVALIDATE_SECONDS } from "@/lib/cache";
import { getDataset } from "@/lib/sheets";
import { NextResponse } from "next/server";

export const revalidate = DATA_REVALIDATE_SECONDS;

export async function GET() {
  return NextResponse.json(await getDataset("rating"), { headers: apiCacheHeaders });
}
