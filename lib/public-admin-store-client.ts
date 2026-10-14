import { defaultClientAdminStore } from "./admin-store-client";
import type { AdminStore } from "./admin-store";
import type { NewsItem } from "./types";

export async function getPublicHomeSections() {
  const response = await fetch("/api/home-sections", { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to load home section settings");
  const data = await response.json() as { homeSections?: AdminStore["homeSections"] };
  return data.homeSections ?? {};
}

export async function getPublicNewsSettings() {
  return fetchJson<{
    newsVisibility: AdminStore["newsVisibility"];
    newsOverrides: Record<string, NewsItem>;
    newsDeleted: AdminStore["newsDeleted"];
  }>("/api/news-settings", {
    newsVisibility: {},
    newsOverrides: {},
    newsDeleted: {}
  });
}

export async function getPublicEventSettings() {
  return fetchJson<Pick<AdminStore, "eventPages">>("/api/event-settings", {
    eventPages: []
  });
}

export async function getPublicManualEvent(slug: string) {
  try {
    const response = await fetch(`/api/manual-events/${encodeURIComponent(slug)}`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchJson<T>(url: string, fallback?: T): Promise<T> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error("Request failed");
    return await response.json() as T;
  } catch {
    return fallback ?? defaultClientAdminStore as T;
  }
}
