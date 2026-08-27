"use client";

import { getAdminStore } from "@/lib/admin-store-client";
import { categories, classes } from "@/lib/mock-data";
import type { NewsVisibility } from "@/lib/news-visibility";
import { NewsItem } from "@/lib/types";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NewsCard } from "./news-card";
import { SelectField } from "./selectors";

export function NewsBrowser({ items }: { items: NewsItem[] }) {
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("Все");
  const [categoryFilter, setCategoryFilter] = useState("Все");
  const [tagFilter, setTagFilter] = useState("Все");
  const [visibility, setVisibility] = useState<NewsVisibility>({});
  const [overrides, setOverrides] = useState<Record<string, NewsItem>>({});
  const displayItems = useMemo(() => items.map((item) => ({ ...item, ...overrides[item.slug] })), [items, overrides]);
  const tags = Array.from(new Set(displayItems.flatMap((item) => item.tags)));

  useEffect(() => {
    function loadNewsSettings() {
      getAdminStore()
        .then((store) => {
          setVisibility(store.newsVisibility as NewsVisibility);
          setOverrides(store.newsOverrides as Record<string, NewsItem>);
        })
        .catch(() => {
          setVisibility({});
          setOverrides({});
        });
    }

    loadNewsSettings();
    window.addEventListener("storage", loadNewsSettings);
    window.addEventListener("school46.news-visibility-updated", loadNewsSettings);
    window.addEventListener("school46.news-updated", loadNewsSettings);
    return () => {
      window.removeEventListener("storage", loadNewsSettings);
      window.removeEventListener("school46.news-visibility-updated", loadNewsSettings);
      window.removeEventListener("school46.news-updated", loadNewsSettings);
    };
  }, []);

  const filtered = useMemo(
    () =>
      displayItems.filter((item) => {
        const text = `${item.title} ${item.text}`.toLowerCase();
        return (
          item.status === "published" &&
          visibility[item.slug] !== false &&
          text.includes(query.toLowerCase()) &&
          (classFilter === "Все" || item.className === classFilter || item.className === "Все") &&
          (categoryFilter === "Все" || item.category === categoryFilter) &&
          (tagFilter === "Все" || item.tags.includes(tagFilter))
        );
      }),
    [categoryFilter, classFilter, displayItems, query, tagFilter, visibility]
  );

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 rounded-[8px] border border-line bg-white p-4 shadow-sm lg:grid-cols-[1fr_180px_220px_180px]">
        <label className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск по новостям"
            className="focus-ring w-full rounded-[8px] border border-line py-2 pl-10 pr-3"
          />
        </label>
        <SelectField label="Класс" value={classFilter} options={["Все", ...classes]} onChange={setClassFilter} />
        <SelectField label="Рубрика" value={categoryFilter} options={["Все", ...categories.map((item) => item.title)]} onChange={setCategoryFilter} />
        <SelectField label="Тег" value={tagFilter} options={["Все", ...tags]} onChange={setTagFilter} />
      </div>
      {filtered.length ? (
        <div className="grid gap-5 md:grid-cols-3">
          {filtered.map((item) => <NewsCard key={item.id} item={item} />)}
        </div>
      ) : (
        <div className="rounded-[8px] border border-dashed border-line bg-white p-8 text-center text-slate-500">Новостей по этим фильтрам пока нет.</div>
      )}
    </div>
  );
}
