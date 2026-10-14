import { distanceLearningApiCacheHeaders, DISTANCE_LEARNING_REVALIDATE_SECONDS, noStoreHeaders } from "@/lib/cache";
import { getDistanceLearningData, todayInSamara } from "@/lib/distance-learning";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const originCacheMs = DISTANCE_LEARNING_REVALIDATE_SECONDS * 1000;
const manualRefreshCooldownMs = 60_000;
let cachedPayload: Awaited<ReturnType<typeof loadPayload>> | null = null;
let cachedUntil = 0;
let lastLoadedAt = 0;
let pendingPayload: Promise<Awaited<ReturnType<typeof loadPayload>>> | null = null;

export async function GET(request: NextRequest) {
  const manualRefresh = request.nextUrl.searchParams.get("refresh") === "1";
  try {
    const payload = await getPayload(manualRefresh);
    return NextResponse.json(payload, { headers: manualRefresh ? noStoreHeaders : distanceLearningApiCacheHeaders });
  } catch {
    return NextResponse.json(
      { error: "Не удалось обновить данные дистанционного обучения" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}

async function getPayload(manualRefresh = false) {
  const now = Date.now();
  const canRefreshManually = manualRefresh && (!cachedPayload || now - lastLoadedAt >= manualRefreshCooldownMs);
  if (cachedPayload && cachedUntil > now && !canRefreshManually) return cachedPayload;
  pendingPayload ??= loadPayload().finally(() => {
    pendingPayload = null;
  });
  const payload = await pendingPayload;
  cachedPayload = payload;
  cachedUntil = Date.now() + originCacheMs;
  lastLoadedAt = Date.now();
  return payload;
}

async function loadPayload() {
  const today = todayInSamara();
  const data = await getDistanceLearningData(today, { fresh: true });
  return { ...data, today, updatedAt: new Date().toISOString() };
}
