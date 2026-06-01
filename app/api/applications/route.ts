import { appendDatasetItem, getDataset } from "@/lib/sheets";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(await getDataset("applications"));
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json(await appendDatasetItem("applications", { ...body, status: "new" }), { status: 201 });
}
