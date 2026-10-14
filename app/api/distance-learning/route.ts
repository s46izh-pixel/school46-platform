import { distanceLearningApiCacheHeaders, DISTANCE_LEARNING_REVALIDATE_SECONDS } from "@/lib/cache";
import { getDistanceLearningData, todayInSamara } from "@/lib/distance-learning";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const originCacheMs = DISTANCE_LEARNING_REVALIDATE_SECONDS * 1000;
let cachedPayload: Awaited<ReturnType<typeof loadPayload>> | null = null;
let cachedUntil = 0;
let pendingPayload: Promise<Awaited<ReturnType<typeof loadPayload>>> | null = null;

export async function GET() {
  try {
    const payload = await getPayload();
    return NextResponse.json(payload, { headers: distanceLearningApiCacheHeaders });
  } catch {
    return NextResponse.json(
      { error: "Не удалось обновить данные дистанционного обучения" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}

async function getPayload() {
  if (cachedPayload && cachedUntil > Date.now()) return cachedPayload;
  pendingPayload ??= loadPayload().finally(() => {
    pendingPayload = null;
  });
  const payload = await pendingPayload;
  cachedPayload = payload;
  cachedUntil = Date.now() + originCacheMs;
  return payload;
}

async function loadPayload() {
  const today = todayInSamara();
  const data = await getDistanceLearningData(today, { fresh: true });
  return { ...data, today, updatedAt: new Date().toISOString() };
}
