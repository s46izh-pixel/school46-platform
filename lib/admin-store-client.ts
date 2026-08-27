import type { AdminStore } from "./admin-store";

export type { AdminStore };

export const defaultClientAdminStore: AdminStore = {
  eventPages: [],
  calendarTemplateVisibility: {},
  newsVisibility: {},
  newsOverrides: {},
  homeSections: {}
};

export async function getAdminStore() {
  const response = await fetch("/api/admin-store", { cache: "no-store" });
  if (!response.ok) return defaultClientAdminStore;
  return { ...defaultClientAdminStore, ...await response.json() } as AdminStore;
}

export async function patchAdminStore(patch: Partial<AdminStore>) {
  const response = await fetch("/api/admin-store", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch)
  });
  if (!response.ok) throw new Error("Не удалось сохранить настройки");
  return { ...defaultClientAdminStore, ...await response.json() } as AdminStore;
}
