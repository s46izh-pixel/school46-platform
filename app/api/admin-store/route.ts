import { readAdminStore, updateAdminStore } from "@/lib/admin-store";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(await readAdminStore());
}

export async function PATCH(request: Request) {
  const patch = await request.json();
  return NextResponse.json(await updateAdminStore(patch));
}
