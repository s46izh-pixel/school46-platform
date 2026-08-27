import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { NewsItem } from "./types";

export type AdminStore = {
  eventPages: unknown[];
  calendarTemplateVisibility: Record<string, boolean>;
  newsVisibility: Record<string, boolean>;
  newsOverrides: Record<string, NewsItem>;
  homeSections: Record<string, boolean>;
};

export const defaultAdminStore: AdminStore = {
  eventPages: [],
  calendarTemplateVisibility: {},
  newsVisibility: {},
  newsOverrides: {},
  homeSections: {}
};

const storePath = path.join(process.cwd(), "data", "admin-store.json");

export async function readAdminStore(): Promise<AdminStore> {
  try {
    const content = await readFile(storePath, "utf8");
    const parsed = JSON.parse(content) as Partial<AdminStore>;
    return { ...defaultAdminStore, ...parsed };
  } catch {
    return defaultAdminStore;
  }
}

export async function updateAdminStore(patch: Partial<AdminStore>) {
  const current = await readAdminStore();
  const next = { ...current, ...patch };
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, JSON.stringify(next, null, 2), "utf8");
  return next;
}
