import type { NewsItem } from "./types";

export function mergeNewsItems(items: NewsItem[], overrides: Record<string, NewsItem>) {
  const baseSlugs = new Set(items.map((item) => item.slug));
  const merged = items.map((item) => ({ ...item, ...overrides[item.slug] }));
  const created = Object.values(overrides).filter((item) => !baseSlugs.has(item.slug));
  return [...merged, ...created].sort((first, second) => second.date.localeCompare(first.date));
}
