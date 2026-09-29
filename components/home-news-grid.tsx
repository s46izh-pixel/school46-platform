"use client";

import type { NewsVisibility } from "@/lib/news-visibility";
import { getPublicNewsSettings } from "@/lib/public-admin-store-client";
import type { NewsItem } from "@/lib/types";
import { mergeNewsItems } from "@/lib/news-items";
import { useEffect, useMemo, useState } from "react";
import { NewsCard } from "./news-card";

export function HomeNewsGrid({ items, limit = 3 }: { items: NewsItem[]; limit?: number }) {
  const [visibility, setVisibility] = useState<NewsVisibility>({});
  const [overrides, setOverrides] = useState<Record<string, NewsItem>>({});
  const [deleted, setDeleted] = useState<Record<string, boolean>>({});

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

  const visibleItems = useMemo(
    () => mergeNewsItems(items, overrides).filter((item) => item.status === "published" && deleted[item.slug] !== true && visibility[item.slug] !== false).slice(0, limit),
    [deleted, items, limit, overrides, visibility]
  );

  if (!visibleItems.length) {
    return <div className="rounded-[8px] border border-dashed border-line bg-white p-8 text-center text-slate-500">Новости временно скрыты.</div>;
  }

  return (
    <div className="grid items-start gap-5 md:grid-cols-3">
      {visibleItems.map((item) => <NewsCard key={item.id} item={item} />)}
    </div>
  );
}
