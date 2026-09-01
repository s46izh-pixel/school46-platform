import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { ApplicationItem, NewsItem } from "./types";

export type AdminStore = {
  eventPages: unknown[];
  calendarTemplateVisibility: Record<string, boolean>;
  newsVisibility: Record<string, boolean>;
  newsOverrides: Record<string, NewsItem>;
  homeSections: Record<string, boolean>;
  applications: ApplicationItem[];
  adminPasswordHash?: string;
};

export const defaultAdminStore: AdminStore = {
  eventPages: [],
  calendarTemplateVisibility: {},
  newsVisibility: {},
  newsOverrides: {},
  homeSections: {},
  applications: []
};

const storePath = path.join(process.cwd(), "data", "admin-store.json");
const maxInlineImageLength = 450_000;

export async function readAdminStore(): Promise<AdminStore> {
  try {
    const content = await readFile(storePath, "utf8");
    const parsed = JSON.parse(content) as Partial<AdminStore>;
    return sanitizeAdminStore({ ...defaultAdminStore, ...parsed });
  } catch {
    return defaultAdminStore;
  }
}

export async function updateAdminStore(patch: Partial<AdminStore>) {
  const current = await readAdminStore();
  const next = sanitizeAdminStore({ ...current, ...patch });
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, JSON.stringify(next, null, 2), "utf8");
  return next;
}

function sanitizeAdminStore(store: AdminStore): AdminStore {
  return {
    ...defaultAdminStore,
    ...store,
    eventPages: Array.isArray(store.eventPages) ? store.eventPages.map(sanitizeEventPage) : [],
    calendarTemplateVisibility: sanitizeBooleanRecord(store.calendarTemplateVisibility),
    newsVisibility: sanitizeBooleanRecord(store.newsVisibility),
    newsOverrides: sanitizeNewsOverrides(store.newsOverrides),
    homeSections: sanitizeBooleanRecord(store.homeSections),
    applications: sanitizeApplications(store.applications),
    adminPasswordHash: typeof store.adminPasswordHash === "string" ? store.adminPasswordHash : undefined
  };
}

function sanitizeEventPage(item: unknown) {
  if (!item || typeof item !== "object") return item;
  const draft = { ...(item as Record<string, unknown>) };
  if (typeof draft.cover === "string" && isOversizedInlineImage(draft.cover)) {
    draft.cover = "";
    draft.coverFileName = "";
  }
  return draft;
}

function sanitizeNewsOverrides(value: unknown): Record<string, NewsItem> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, NewsItem>;
}

function sanitizeApplications(value: unknown): ApplicationItem[] {
  return Array.isArray(value) ? value as ApplicationItem[] : [];
}

function sanitizeBooleanRecord(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, boolean>;
}

function isOversizedInlineImage(value: string) {
  return value.startsWith("data:image/") && value.length > maxInlineImageLength;
}
