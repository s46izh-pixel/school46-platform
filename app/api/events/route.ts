import { EVENTS_REVALIDATE_SECONDS, shortApiCacheHeaders } from "@/lib/cache";
import { appendDatasetItem, getDataset } from "@/lib/sheets";
import { NextResponse } from "next/server";

export const revalidate = EVENTS_REVALIDATE_SECONDS;

export async function GET() {
  return NextResponse.json(await getDataset("events"), { headers: shortApiCacheHeaders });
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json(await appendDatasetItem("events", body), { status: 201 });
}
