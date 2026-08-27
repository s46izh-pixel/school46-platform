"use client";

import { Card, SectionTitle } from "@/components/card";
import { getAdminStore, patchAdminStore } from "@/lib/admin-store-client";
import { categories, classes, news } from "@/lib/mock-data";
import type { NewsItem, NewsStatus } from "@/lib/types";
import { CheckCircle2, Save } from "lucide-react";
import Link from "next/link";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";

export default function EditNewsPage({ params }: { params: { slug: string } }) {
  const slug = decodeURIComponent(params.slug);
  const [item, setItem] = useState<NewsItem | null | undefined>(undefined);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getAdminStore().then((store) => {
      const source = news.find((entry) => entry.slug === slug);
      const override = store.newsOverrides[slug];
      setItem(source ? { ...source, ...override } : null);
    }).catch(() => {
      const source = news.find((entry) => entry.slug === slug);
      setItem(source ?? null);
    });
  }, [slug]);

  function update(field: keyof NewsItem, value: string | string[]) {
    setSaved(false);
    setItem((current) => current ? { ...current, [field]: value } : current);
  }

  function handlePhotoFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") update("photo", reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!item) return;
    const store = await getAdminStore();
    await patchAdminStore({ newsOverrides: { ...store.newsOverrides, [item.slug]: item } });
    window.dispatchEvent(new CustomEvent("school46.news-updated"));
    window.dispatchEvent(new CustomEvent("school46.news-visibility-updated"));
    setSaved(true);
  }

  if (item === undefined) {
    return (
      <main className="grid min-h-screen place-items-center bg-mist px-4">
        <Card className="max-w-lg bg-white">Загружаем новость...</Card>
      </main>
    );
  }

  if (!item) {
    return (
      <main className="grid min-h-screen place-items-center bg-mist px-4">
        <Card className="max-w-lg bg-white">
          <h1 className="text-2xl font-semibold text-ink">Новость не найдена</h1>
          <Link href="/admin" className="mt-4 inline-flex rounded-[8px] bg-ink px-4 py-3 text-sm font-semibold text-white">Назад в админку</Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-mist">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link href="/admin" className="rounded-[8px] bg-white px-4 py-2 text-sm font-semibold text-ink shadow-sm">Назад в админку</Link>
          {saved ? <span className="flex items-center gap-2 rounded-[8px] bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700"><CheckCircle2 size={17} /> Новость сохранена</span> : null}
        </div>

        <Card className="bg-white">
          <SectionTitle eyebrow="Новости" title="Редактировать новость" action={<Link href={`/news/${item.slug}`} className="rounded-[8px] bg-mist px-4 py-3 text-sm font-semibold text-ink">Открыть на сайте</Link>} />
          <form onSubmit={save} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid gap-3 rounded-[8px] border border-line bg-mist p-4">
              <input value={item.title} onChange={(event) => update("title", event.target.value)} placeholder="Заголовок" className="focus-ring rounded-[8px] border border-line bg-white px-3 py-3" />
              <textarea value={item.text} onChange={(event) => update("text", event.target.value)} rows={10} placeholder="Текст новости" className="focus-ring rounded-[8px] border border-line bg-white px-3 py-3" />
              <div className="grid gap-3 md:grid-cols-2">
                <input value={item.date} onChange={(event) => update("date", event.target.value)} type="date" className="focus-ring rounded-[8px] border border-line bg-white px-3 py-3" />
                <input value={item.author} onChange={(event) => update("author", event.target.value)} placeholder="Автор" className="focus-ring rounded-[8px] border border-line bg-white px-3 py-3" />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <select value={item.className} onChange={(event) => update("className", event.target.value)} className="focus-ring rounded-[8px] border border-line bg-white px-3 py-3">
                  {["Все", ...classes].map((className) => <option key={className}>{className}</option>)}
                </select>
                <select value={item.category} onChange={(event) => update("category", event.target.value)} className="focus-ring rounded-[8px] border border-line bg-white px-3 py-3">
                  {categories.map((category) => <option key={category.id}>{category.title}</option>)}
                </select>
              </div>
              <input value={item.tags.join(", ")} onChange={(event) => update("tags", splitTags(event.target.value))} placeholder="Теги через запятую" className="focus-ring rounded-[8px] border border-line bg-white px-3 py-3" />
            </div>

            <aside className="grid content-start gap-4">
              <div className="grid gap-3 rounded-[8px] border border-line bg-mist p-4">
                <h2 className="font-semibold text-ink">Обложка</h2>
                <input value={item.photo.startsWith("data:") ? "" : item.photo} onChange={(event) => update("photo", event.target.value)} placeholder="Ссылка на изображение" className="focus-ring rounded-[8px] border border-line bg-white px-3 py-3" />
                <input onChange={handlePhotoFile} type="file" accept="image/*" className="focus-ring rounded-[8px] border border-line bg-white px-3 py-3" />
                {item.photo ? (
                  <div className="overflow-hidden rounded-[8px] border border-line bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.photo} alt="" className="aspect-[16/10] w-full object-cover" />
                  </div>
                ) : null}
              </div>
              <div className="grid gap-3 rounded-[8px] border border-line bg-mist p-4">
                <h2 className="font-semibold text-ink">Публикация</h2>
                <select value={item.status} onChange={(event) => update("status", event.target.value as NewsStatus)} className="focus-ring rounded-[8px] border border-line bg-white px-3 py-3">
                  <option value="draft">Черновик</option>
                  <option value="published">Опубликована</option>
                  <option value="archived">Архив</option>
                </select>
                <button className="focus-ring flex items-center justify-center gap-2 rounded-[8px] bg-ink px-4 py-3 font-semibold text-white">
                  <Save size={18} />
                  Сохранить новость
                </button>
              </div>
            </aside>
          </form>
        </Card>
      </div>
    </main>
  );
}

function splitTags(value: string) {
  return value.split(/[,;\n]+/).map((item) => item.trim()).filter(Boolean);
}
