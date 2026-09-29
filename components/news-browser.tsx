"use client";

import type { NewsVisibility } from "@/lib/news-visibility";
import { richTextToPlainText } from "@/lib/rich-text";
import { mergeNewsItems } from "@/lib/news-items";
import { sameNewsClass, uniqueNewsClasses } from "@/lib/news-options";
import { getPublicNewsSettings } from "@/lib/public-admin-store-client";
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
  const [deleted, setDeleted] = useState<Record<string, boolean>>({});
  const displayItems = useMemo(() => mergeNewsItems(items, overrides), [items, overrides]);
  const tags = Array.from(new Set(displayItems.flatMap((item) => item.tags)));
  const classOptions = ["Все", ...uniqueNewsClasses(displayItems.map((item) => item.className).filter((value) => value && value !== "Все"))];
  const categoryOptions = ["Все", ...Array.from(new Set(displayItems.map((item) => item.category).filter(Boolean)))];

  useEffect(() => {
    function loadNewsSettings() {
      getPublicNewsSettings()
        .then((settings) => {
          setVisibility(settings.newsVisibility as NewsVisibility);
          setOverrides(settings.newsOverrides as Record<string, NewsItem>);
          setDeleted(settings.newsDeleted || {});
        })
        .catch(() => {
          setVisibility({});
          setOverrides({});
          setDeleted({});
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
        const text = `${item.title} ${item.author} ${richTextToPlainText(item.text)}`.toLowerCase();
        return (
          item.status === "published" &&
          deleted[item.slug] !== true &&
          visibility[item.slug] !== false &&
          text.includes(query.toLowerCase()) &&
          (classFilter === "Все" || sameNewsClass(item.className, classFilter) || item.className === "Все") &&
          (categoryFilter === "Все" || item.category === categoryFilter) &&
          (tagFilter === "Все" || item.tags.includes(tagFilter))
        );
      }),
    [categoryFilter, classFilter, deleted, displayItems, query, tagFilter, visibility]
  );

  return (
    <div className="grid gap-5">
      <div className="grid items-end gap-3 rounded-[8px] border border-line bg-white p-4 shadow-sm lg:grid-cols-[minmax(260px,1fr)_180px_220px_180px]">
        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-600">
          Поиск
          <span className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Название, текст или автор"
              className="focus-ring w-full rounded-[8px] border border-line bg-white py-2 pl-10 pr-3 text-ink"
            />
          </span>
        </label>
        <SelectField label="Класс" value={classFilter} options={classOptions} onChange={setClassFilter} />
        <SelectField label="Рубрика" value={categoryFilter} options={categoryOptions} onChange={setCategoryFilter} />
        <SelectField label="Тег" value={tagFilter} options={["Все", ...tags]} onChange={setTagFilter} />
      </div>
      {filtered.length ? (
        <div className="grid items-start gap-5 md:grid-cols-3">
          {filtered.map((item) => <NewsCard key={item.id} item={item} />)}
        </div>
      ) : (
        <div className="rounded-[8px] border border-dashed border-line bg-white p-8 text-center text-slate-500">Новостей по этим фильтрам пока нет.</div>
      )}
    </div>
  );
}
