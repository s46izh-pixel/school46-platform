import { readAdminStore, updateAdminStore } from "@/lib/admin-store";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    return NextResponse.json(await readAdminStore());
  } catch {
    return NextResponse.json({ eventPages: [], calendarTemplateVisibility: {}, newsVisibility: {}, newsOverrides: {}, homeSections: {} });
  }
}

export async function PATCH(request: Request) {
  try {
    const patch = await request.json();
    return NextResponse.json(await updateAdminStore(patch));
  } catch {
    return NextResponse.json({ message: "Не удалось сохранить настройки. Попробуйте уменьшить изображение или повторить позже." }, { status: 500 });
  }
}
