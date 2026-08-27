import { getDataset, getScheduleChanges } from "@/lib/sheets";
import { NextResponse } from "next/server";

export async function GET() {
  const [lessons, bells, changes] = await Promise.all([getDataset("schedule"), getDataset("bells"), getScheduleChanges()]);
  return NextResponse.json({ lessons, bells, changes });
}
