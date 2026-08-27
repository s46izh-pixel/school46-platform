"use client";

import { getAdminStore } from "@/lib/admin-store-client";
import type { NewsVisibility } from "@/lib/news-visibility";
import type { NewsItem } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
import { NewsCard } from "./news-card";

export function HomeNewsGrid({ items, limit = 3 }: { items: NewsItem[]; limit?: number }) {
  const [visibility, setVisibility] = useState<NewsVisibility>({});
  const [overrides, setOverrides] = useState<Record<string, NewsItem>>({});

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

  const visibleItems = useMemo(
    () => items.map((item) => ({ ...item, ...overrides[item.slug] })).filter((item) => item.status === "published" && visibility[item.slug] !== false).slice(0, limit),
    [items, limit, overrides, visibility]
  );

  if (!visibleItems.length) {
    return <div className="rounded-[8px] border border-dashed border-line bg-white p-8 text-center text-slate-500">Новости временно скрыты.</div>;
  }

  return (
    <div className="grid gap-5 md:grid-cols-3">
      {visibleItems.map((item) => <NewsCard key={item.id} item={item} />)}
    </div>
  );
}
