import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { hasDatabaseAdminStore, mutateAdminStoreInDatabase, readAdminStoreFromDatabase } from "./admin-store-db";
import type { ApplicationExportRecord, ApplicationItem, NewsItem } from "./types";
import { defaultNewsClasses, uniqueNewsClasses } from "./news-options";

export type AdminStore = {
  eventPages: unknown[];
  calendarTemplateVisibility: Record<string, boolean>;
  newsVisibility: Record<string, boolean>;
  newsOverrides: Record<string, NewsItem>;
  newsDeleted: Record<string, boolean>;
  newsClasses: string[];
  newsCategories: string[];
  homeSections: Record<string, boolean>;
  applications: ApplicationItem[];
  applicationExports: Record<string, ApplicationExportRecord>;
  adminPasswordHash?: string;
};

export const defaultAdminStore: AdminStore = {
  eventPages: [],
  calendarTemplateVisibility: {},
  newsVisibility: {},
  newsOverrides: {},
  newsDeleted: {},
  newsClasses: [...defaultNewsClasses],
  newsCategories: [],
  homeSections: {},
  applications: [],
  applicationExports: {}
};

const storePath = path.join(process.cwd(), "data", "admin-store.json");
const maxInlineImageLength = 1_600_000;
let fileMutationQueue: Promise<void> = Promise.resolve();

export async function readAdminStore(): Promise<AdminStore> {
  if (hasDatabaseAdminStore()) {
    const store = await readAdminStoreFromDatabase();
    return sanitizeAdminStore({ ...defaultAdminStore, ...store });
  }

  try {
    const content = await readFile(storePath, "utf8");
    const parsed = JSON.parse(content) as Partial<AdminStore>;
    return sanitizeAdminStore({ ...defaultAdminStore, ...parsed });
  } catch {
    return defaultAdminStore;
  }
}

export async function updateAdminStore(patch: Partial<AdminStore>) {
  return mutateAdminStore((current) => ({ ...current, ...patch }));
}

export async function mutateAdminStore(mutate: (store: AdminStore) => Partial<AdminStore> | AdminStore) {
  if (hasDatabaseAdminStore()) {
    return mutateAdminStoreInDatabase((stored) => {
      const current = sanitizeAdminStore({ ...defaultAdminStore, ...stored });
      return sanitizeAdminStore({ ...current, ...mutate(current) });
    });
  }

  const operation = fileMutationQueue.then(async () => {
    const current = await readAdminStore();
    const next = sanitizeAdminStore({ ...current, ...mutate(current) });
    await mkdir(path.dirname(storePath), { recursive: true });
    await writeFile(storePath, JSON.stringify(next, null, 2), "utf8");
    return next;
  });
  fileMutationQueue = operation.then(() => undefined, () => undefined);
  return operation;
}

function sanitizeAdminStore(store: AdminStore): AdminStore {
  return {
    ...defaultAdminStore,
    ...store,
    eventPages: Array.isArray(store.eventPages) ? store.eventPages.map(sanitizeEventPage) : [],
    calendarTemplateVisibility: sanitizeBooleanRecord(store.calendarTemplateVisibility),
    newsVisibility: sanitizeBooleanRecord(store.newsVisibility),
    newsOverrides: sanitizeNewsOverrides(store.newsOverrides),
    newsDeleted: sanitizeBooleanRecord(store.newsDeleted),
    newsClasses: sanitizeStringList(store.newsClasses),
    newsCategories: sanitizeStringList(store.newsCategories),
    homeSections: sanitizeBooleanRecord(store.homeSections),
    applications: sanitizeApplications(store.applications),
    applicationExports: sanitizeApplicationExports(store.applicationExports),
    adminPasswordHash: typeof store.adminPasswordHash === "string" ? store.adminPasswordHash : undefined
  };
}

function sanitizeApplicationExports(value: unknown): Record<string, ApplicationExportRecord> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, ApplicationExportRecord> = {};
  for (const [key, item] of Object.entries(value)) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as Partial<ApplicationExportRecord>;
    if (typeof record.exportedAt !== "string") continue;
    result[key] = {
      eventTitle: typeof record.eventTitle === "string" ? record.eventTitle : key,
      exportedAt: record.exportedAt,
      applicationCount: typeof record.applicationCount === "number" ? record.applicationCount : 0,
      latestApplicationAt: typeof record.latestApplicationAt === "string" ? record.latestApplicationAt : ""
    };
  }
  return result;
}

function sanitizeEventPage(item: unknown) {
  if (!item || typeof item !== "object") return item;
  const draft = { ...(item as Record<string, unknown>) };
  if (typeof draft.cover === "string" && isOversizedInlineImage(draft.cover)) {
    draft.cover = "";
    draft.coverFileName = "";
  }
  if (typeof draft.coverWide === "string" && isOversizedInlineImage(draft.coverWide)) {
    draft.coverWide = "";
    draft.coverWideFileName = "";
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

function sanitizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return uniqueNewsClasses(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean));
}

function isOversizedInlineImage(value: string) {
  return value.startsWith("data:image/") && value.length > maxInlineImageLength;
}
