"use client";

import { PageShell } from "@/components/page-shell";
import { getAdminStore } from "@/lib/admin-store-client";
import { news } from "@/lib/mock-data";
import type { NewsItem } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function NewsItemPage({ params }: { params: { slug: string } }) {
  const [item, setItem] = useState<NewsItem | null | undefined>(undefined);

  useEffect(() => {
    function loadNews() {
      const source = news.find((entry) => entry.slug === params.slug);
      if (!source) {
        setItem(null);
        return;
      }
      getAdminStore()
        .then((store) => {
          const nextItem = { ...source, ...store.newsOverrides[source.slug] };
          setItem(nextItem.status === "published" && store.newsVisibility[nextItem.slug] !== false ? nextItem : null);
        })
        .catch(() => setItem(source.status === "published" ? source : null));
    }

    loadNews();
    window.addEventListener("storage", loadNews);
    window.addEventListener("school46.news-updated", loadNews);
    window.addEventListener("school46.news-visibility-updated", loadNews);
    return () => {
      window.removeEventListener("storage", loadNews);
      window.removeEventListener("school46.news-updated", loadNews);
      window.removeEventListener("school46.news-visibility-updated", loadNews);
    };
  }, [params.slug]);

  if (item === undefined) {
    return (
      <PageShell>
        <article className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-[8px] border border-line bg-white p-6 shadow-sm">Загружаем новость...</div>
        </article>
      </PageShell>
    );
  }

  if (!item) {
    return (
      <PageShell>
        <article className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-[8px] border border-line bg-white p-6 shadow-sm">
            <h1 className="text-3xl font-semibold text-ink">Новость не найдена</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">Возможно, новость скрыта, перемещена в архив или ещё не опубликована.</p>
            <Link href="/news" className="mt-5 inline-flex rounded-[8px] bg-ink px-4 py-3 text-sm font-semibold text-white">Вернуться к новостям</Link>
          </div>
        </article>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <article className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold text-apple">{formatDate(item.date)} · {item.category}</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">{item.title}</h1>
        {item.photo ? (
          <div className="mt-8 overflow-hidden rounded-[8px] bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.photo} alt="" className="aspect-[16/9] w-full object-cover" />
          </div>
        ) : null}
        <p className="mt-8 whitespace-pre-line text-lg leading-8 text-slate-700">{item.text}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {item.tags.map((tag) => <span key={tag} className="rounded-[8px] bg-mist px-3 py-2 text-sm font-semibold text-slate-600">{tag}</span>)}
        </div>
      </article>
    </PageShell>
  );
}
