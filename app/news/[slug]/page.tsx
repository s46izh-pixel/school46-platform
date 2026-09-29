"use client";

import { PageShell } from "@/components/page-shell";
import { NewsGallery } from "@/components/news-gallery";
import { RichTextContent } from "@/components/rich-text-content";
import { news } from "@/lib/mock-data";
import { getPublicNewsSettings } from "@/lib/public-admin-store-client";
import type { NewsItem } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function NewsItemPage({ params }: { params: { slug: string } }) {
  const [item, setItem] = useState<NewsItem | null | undefined>(undefined);

  useEffect(() => {
    function loadNews() {
      const source = news.find((entry) => entry.slug === params.slug);
      getPublicNewsSettings()
        .then((settings) => {
          const override = settings.newsOverrides[params.slug] as NewsItem | undefined;
          const nextItem = source ? { ...source, ...override } : override;
          if (!nextItem) {
            setItem(null);
            return;
          }
          setItem(nextItem.status === "published" && settings.newsDeleted[nextItem.slug] !== true && settings.newsVisibility[nextItem.slug] !== false ? nextItem : null);
        })
        .catch(() => setItem(source?.status === "published" ? source : null));
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
      <article className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mx-auto max-w-4xl">
          <p className="text-sm font-semibold text-apple">{formatDate(item.date)} · {item.category}</p>
          <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">{item.title}</h1>
          {item.author ? <p className="mt-3 text-sm text-slate-500">Автор: {item.author}</p> : null}
        </header>
        {item.photo ? (
          <div className="mx-auto mt-8 max-w-5xl overflow-hidden rounded-[8px] bg-slate-100 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.photo} alt="" className="aspect-[16/9] w-full object-cover" />
          </div>
        ) : null}
        <div className="mt-8 grid gap-8">
          {item.contentBlocks?.length ? item.contentBlocks.map((block) => block.kind === "gallery"
            ? <NewsGallery key={block.id} block={block} />
            : <RichTextContent key={block.id} value={block.text || ""} className="mx-auto w-full max-w-4xl text-lg leading-8" />)
            : <RichTextContent value={item.text} className="mx-auto w-full max-w-4xl text-lg leading-8" />}
        </div>
        <div className="mx-auto mt-6 flex max-w-4xl flex-wrap gap-2">
          {item.tags.map((tag) => <span key={tag} className="rounded-[8px] bg-mist px-3 py-2 text-sm font-semibold text-slate-600">{tag}</span>)}
        </div>
      </article>
    </PageShell>
  );
}
