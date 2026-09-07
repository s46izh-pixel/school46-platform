import { apiCacheHeaders, DATA_REVALIDATE_SECONDS } from "@/lib/cache";
import { appendDatasetItem, getDataset } from "@/lib/sheets";
import { NextResponse } from "next/server";

export const revalidate = DATA_REVALIDATE_SECONDS;

export async function GET() {
  return NextResponse.json(await getDataset("preferences"), { headers: apiCacheHeaders });
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json(await appendDatasetItem("preferences", body), { status: 201 });
}
