import { getDataset } from "@/lib/sheets";
import { NextResponse } from "next/server";

export async function GET() {
  const [lessons, bells] = await Promise.all([getDataset("schedule"), getDataset("bells")]);
  return NextResponse.json({ lessons, bells });
}
