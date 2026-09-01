import type { AdminStore } from "./admin-store";

export type { AdminStore };

const localAdminStoreKey = "school46.adminStore.fallback";

export const defaultClientAdminStore: AdminStore = {
  eventPages: [],
  calendarTemplateVisibility: {},
  newsVisibility: {},
  newsOverrides: {},
  homeSections: {},
  applications: []
};

export async function getAdminStore() {
  try {
    const response = await fetch("/api/admin-store", { cache: "no-store" });
    if (!response.ok) return readLocalAdminStore();
    return { ...defaultClientAdminStore, ...await response.json() } as AdminStore;
  } catch {
    return readLocalAdminStore();
  }
}

export async function patchAdminStore(patch: Partial<AdminStore>) {
  const current = readLocalAdminStore();
  const optimistic = { ...current, ...patch } as AdminStore;
  writeLocalAdminStore(optimistic);
  try {
    const response = await fetch("/api/admin-store", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    if (!response.ok) throw new Error("Не удалось сохранить настройки");
    const saved = { ...defaultClientAdminStore, ...await response.json() } as AdminStore;
    writeLocalAdminStore(saved);
    return saved;
  } catch {
    return optimistic;
  }
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
