import { defaultClientAdminStore } from "./admin-store-client";
import type { AdminStore } from "./admin-store";
import type { NewsItem } from "./types";

export async function getPublicHomeSections() {
  const data = await fetchJson<{ homeSections?: AdminStore["homeSections"] }>("/api/home-sections");
  return data.homeSections ?? {};
}

export async function getPublicNewsSettings() {
  return fetchJson<{ newsVisibility: AdminStore["newsVisibility"]; newsOverrides: Record<string, NewsItem> }>("/api/news-settings", {
    newsVisibility: {},
    newsOverrides: {}
  });
}

export async function getPublicEventSettings() {
  return fetchJson<Pick<AdminStore, "eventPages" | "calendarTemplateVisibility">>("/api/event-settings", {
    eventPages: [],
    calendarTemplateVisibility: {}
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
