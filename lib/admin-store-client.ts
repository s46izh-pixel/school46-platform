import type { AdminStore } from "./admin-store";
import { defaultNewsClasses } from "./news-options";

export type { AdminStore };

const localAdminStoreKey = "school46.adminStore.fallback";
type AdminStoreClientOptions = {
  requireServer?: boolean;
};

export type AdminEventPageOperation =
  | { action: "copy"; slug: string }
  | { action: "delete"; slug: string }
  | { action: "toggle"; slug: string }
  | { action: "upsert"; eventPage: Record<string, unknown>; sourceSlug?: string };

export type AdminEventPageOperationResult = {
  eventPages: unknown[];
  eventPage?: Record<string, unknown>;
};

export const defaultClientAdminStore: AdminStore = {
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

export async function getAdminStore(options: AdminStoreClientOptions = {}) {
  try {
    const response = await fetch("/api/admin-store", { cache: "no-store" });
    if (!response.ok) {
      if (options.requireServer) throw new Error(await readErrorMessage(response));
      return readLocalAdminStore();
    }
    return { ...defaultClientAdminStore, ...await response.json() } as AdminStore;
  } catch (error) {
    if (options.requireServer) throw normalizeError(error);
    return readLocalAdminStore();
  }
}

export async function patchAdminStore(patch: Partial<AdminStore>, options: AdminStoreClientOptions = {}) {
  const current = readLocalAdminStore();
  const optimistic = { ...current, ...patch } as AdminStore;
  if (!options.requireServer) writeLocalAdminStore(optimistic);
  try {
    const response = await fetch("/api/admin-store", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    if (!response.ok) throw new Error(await readErrorMessage(response));
    const saved = { ...defaultClientAdminStore, ...await response.json() } as AdminStore;
    writeLocalAdminStore(saved);
    return saved;
  } catch (error) {
    if (options.requireServer) throw normalizeError(error);
    writeLocalAdminStore(optimistic);
    return optimistic;
  }
}

export async function mutateAdminEventPage(operation: AdminEventPageOperation) {
  const response = await fetch("/api/admin-store/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(operation)
  });
  if (!response.ok) throw new Error(await readErrorMessage(response));
  return await response.json() as AdminEventPageOperationResult;
}

async function readErrorMessage(response: Response) {
  try {
    const data = await response.json() as { message?: string };
    return data.message || "Сервер не принял изменения.";
  } catch {
    return "Сервер не принял изменения.";
  }
}

function normalizeError(error: unknown) {
  return error instanceof Error ? error : new Error("Не удалось связаться с сервером.");
}

function readLocalAdminStore(): AdminStore {
  if (typeof window === "undefined") return defaultClientAdminStore;
  try {
    const saved = window.localStorage.getItem(localAdminStoreKey);
    return saved ? { ...defaultClientAdminStore, ...JSON.parse(saved) } : defaultClientAdminStore;
  } catch {
    return defaultClientAdminStore;
  }
}

function writeLocalAdminStore(store: AdminStore) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(localAdminStoreKey, JSON.stringify(store));
  } catch {
    window.localStorage.removeItem(localAdminStoreKey);
  }
}
