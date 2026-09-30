import { cookieName, verifyAdminSession } from "@/lib/admin-auth";
import { mutateAdminStore, readAdminStore } from "@/lib/admin-store";
import { noStoreHeaders } from "@/lib/cache";
import { exportApplicationsToGoogleSheets, getGoogleApplicationsExportStatus, GoogleExportError } from "@/lib/google-applications-export";
import type { ApplicationExportRecord, ApplicationItem } from "@/lib/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!await verifyAdminSession(cookieFromRequest(request, cookieName))) {
    return NextResponse.json({ message: "Нужно войти в админку." }, { status: 401, headers: noStoreHeaders });
  }
  const verify = new URL(request.url).searchParams.get("verify") === "1";
  return NextResponse.json(await getGoogleApplicationsExportStatus(verify), { headers: noStoreHeaders });
}

export async function POST(request: Request) {
  try {
    if (!await verifyAdminSession(cookieFromRequest(request, cookieName))) {
      return NextResponse.json({ message: "Нужно войти в админку." }, { status: 401, headers: noStoreHeaders });
    }
    const body = await request.json().catch(() => ({})) as { eventTitle?: unknown };
    const eventTitle = typeof body.eventTitle === "string" ? body.eventTitle.trim() : "";
    if (!eventTitle) {
      return NextResponse.json({ message: "Выберите мероприятие для выгрузки." }, { status: 400, headers: noStoreHeaders });
    }
    const store = await readAdminStore();
    const applications = store.applications.filter((item) => item.eventTitle === eventTitle);
    const configuredSiteUrl = (process.env.PUBLIC_SITE_URL || "").trim();
    const requestOrigin = new URL(request.url).origin;
    const result = await exportApplicationsToGoogleSheets(applications, validSiteUrl(configuredSiteUrl) || requestOrigin);
    const exportRecord: ApplicationExportRecord = {
      eventTitle,
      exportedAt: new Date().toISOString(),
      applicationCount: applications.length,
      latestApplicationAt: latestApplicationChange(applications)
    };
    await mutateAdminStore((current) => ({
      applicationExports: { ...current.applicationExports, [eventTitle]: exportRecord }
    }));
    return NextResponse.json({ ...result, exportRecord }, { headers: noStoreHeaders });
  } catch (error) {
    const status = error instanceof GoogleExportError ? error.status : 500;
    const message = error instanceof GoogleExportError ? error.message : "Не удалось выгрузить заявки в Google Таблицу.";
    return NextResponse.json({ message }, { status, headers: noStoreHeaders });
  }
}

function latestApplicationChange(applications: ApplicationItem[]) {
  return applications.reduce((latest, item) => {
    const value = item.updatedAt || item.createdAt || "";
    return Date.parse(value) > Date.parse(latest || "1970-01-01") ? value : latest;
  }, "");
}

function validSiteUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.origin : "";
  } catch {
    return "";
  }
}

function cookieFromRequest(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  return cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${name}=`))?.slice(name.length + 1);
}
