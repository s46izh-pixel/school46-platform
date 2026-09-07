import { noStoreHeaders } from "@/lib/cache";
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ ok: true }, { headers: noStoreHeaders });
}
