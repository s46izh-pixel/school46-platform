"use client";

import { Card, SectionTitle } from "@/components/card";
import { NewsContentBuilder, normalizeNewsBlocks, textFromNewsBlocks } from "@/components/news-content-builder";
import { NewsCoverCropper } from "@/components/news-cover-cropper";
import { getAdminStore, patchAdminStore } from "@/lib/admin-store-client";
import { categories, news } from "@/lib/mock-data";
import { uploadMediaFile } from "@/lib/media-upload-client";
import { defaultNewsClasses, sameNewsClass, uniqueNewsClasses } from "@/lib/news-options";
import type { NewsContentBlock, NewsItem, NewsStatus } from "@/lib/types";
import { CheckCircle2, ImagePlus, Save } from "lucide-react";
import Link from "next/link";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";

export default function EditNewsPage({ params }: { params: { slug: string } }) {
  const slug = decodeURIComponent(params.slug);
  const isNew = slug === "new";
  const [item, setItem] = useState<NewsItem | null | undefined>(undefined);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [coverCropSource, setCoverCropSource] = useState("");
  const [classOptions, setClassOptions] = useState(defaultNewsClasses);
  const [categoryOptions, setCategoryOptions] = useState(categories.map((category) => category.title));

  useEffect(() => {
    getAdminStore().then((store) => {
      const source = news.find((entry) => entry.slug === slug);
      const override = store.newsOverrides[slug] as NewsItem | undefined;
      const nextItem = source ? { ...source, ...override } : override ?? (slug === "new" ? createNewsDraft() : null);
      const availableClasses = store.newsClasses.length ? store.newsClasses : defaultNewsClasses;
      setItem(nextItem ? withNewsBlocks({ ...nextItem, className: canonicalNewsClass(nextItem.className, availableClasses) }) : null);
      setClassOptions(availableClasses);
      setCategoryOptions(store.newsCategories.length ? store.newsCategories : categories.map((category) => category.title));
    }).catch(() => {
      const source = news.find((entry) => entry.slug === slug);
      const nextItem = source ?? (slug === "new" ? createNewsDraft() : null);
      setItem(nextItem ? withNewsBlocks(nextItem) : null);
    });
  }, [slug]);

  function update<K extends keyof NewsItem>(field: K, value: NewsItem[K]) {
    setSaved(false);
    setItem((current) => current ? { ...current, [field]: value } : current);
  }

  function updateBlocks(contentBlocks: NewsContentBlock[]) {
    setSaved(false);
    setItem((current) => current ? { ...current, contentBlocks, text: textFromNewsBlocks(contentBlocks) } : current);
  }

  function handlePhotoFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setSaveError("");
    if (!file.type.startsWith("image/")) {
      setSaveError("Для обложки нужно выбрать изображение.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setCoverCropSource(reader.result);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!item) return;
    setSaveError("");
    try {
      const nextItem = await uploadNewsMedia(item);
      const store = await getAdminStore({ requireServer: true });
      await patchAdminStore({ newsOverrides: { ...store.newsOverrides, [nextItem.slug]: nextItem } }, { requireServer: true });
      setItem(nextItem);
      window.dispatchEvent(new CustomEvent("school46.news-updated"));
      window.dispatchEvent(new CustomEvent("school46.news-visibility-updated"));
      setSaved(true);
    } catch (error) {
      setSaved(false);
      setSaveError(error instanceof Error ? error.message : "Не удалось сохранить новость. Данные на сервере не изменены.");
    }
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
        </div>

        <Card className="bg-white">
          <SectionTitle eyebrow="Новости" title={isNew ? "Создать новость" : "Редактировать новость"} action={!isNew || saved ? <Link href={`/news/${item.slug}`} className="rounded-[8px] bg-mist px-4 py-3 text-sm font-semibold text-ink">Открыть на сайте</Link> : undefined} />
          <form onSubmit={save} className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
            <div className="grid min-w-0 gap-4 rounded-[8px] border border-line bg-mist p-4">
              <Field label="Заголовок новости">
                <input value={item.title} onChange={(event) => update("title", event.target.value)} placeholder="Введите заголовок" className="focus-ring min-w-0 rounded-[8px] border border-line bg-white px-3 py-3" />
              </Field>

              <div className="grid gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-600">Содержание новости</p>
                  <p className="text-xs leading-5 text-slate-500">Добавляйте текстовые блоки и галереи, затем меняйте их порядок стрелками.</p>
                </div>
                <NewsContentBuilder blocks={item.contentBlocks || []} onChange={updateBlocks} />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Дата публикации">
                  <input value={item.date} onChange={(event) => update("date", event.target.value)} type="date" className="focus-ring min-w-0 rounded-[8px] border border-line bg-white px-3 py-3" />
                </Field>
                <Field label="Автор">
                  <input value={item.author} onChange={(event) => update("author", event.target.value)} placeholder="Например: пресс-центр школы" className="focus-ring min-w-0 rounded-[8px] border border-line bg-white px-3 py-3" />
                </Field>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Класс">
                  <select value={item.className} onChange={(event) => update("className", event.target.value)} className="focus-ring min-w-0 rounded-[8px] border border-line bg-white px-3 py-3">
                    {["Все", ...uniqueNewsClasses([...classOptions, item.className].filter((value) => value !== "Все"))].map((className) => <option key={className}>{className}</option>)}
                  </select>
                </Field>
                <Field label="Рубрика">
                  <select value={item.category} onChange={(event) => update("category", event.target.value)} className="focus-ring min-w-0 rounded-[8px] border border-line bg-white px-3 py-3">
                    {uniqueOptions([...categoryOptions, item.category]).map((category) => <option key={category}>{category}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Теги">
                <input value={item.tags.join(", ")} onChange={(event) => update("tags", splitTags(event.target.value))} placeholder="Например: PRO46, город, команда" className="focus-ring min-w-0 rounded-[8px] border border-line bg-white px-3 py-3" />
              </Field>
            </div>

            <aside className="grid min-w-0 content-start gap-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
              <div className="grid min-w-0 gap-3 rounded-[8px] border border-line bg-mist p-4">
                <div>
                  <h2 className="font-semibold text-ink">Обложка 16:9</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">После выбора файла настройте масштаб и положение изображения.</p>
                </div>
                <Field label="Ссылка на изображение">
                  <input value={item.photo.startsWith("data:") ? "" : item.photo} onChange={(event) => update("photo", event.target.value)} placeholder="https://..." className="focus-ring min-w-0 rounded-[8px] border border-line bg-white px-3 py-3" />
                </Field>
                <label className="focus-ring flex cursor-pointer items-center justify-center gap-2 rounded-[8px] border border-line bg-white px-3 py-3 text-sm font-semibold text-ink">
                  <ImagePlus size={17} /> Выбрать файл
                  <input onChange={handlePhotoFile} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" />
                </label>
                {coverCropSource ? (
                  <NewsCoverCropper
                    source={coverCropSource}
                    onCancel={() => setCoverCropSource("")}
                    onApply={(photo) => { update("photo", photo); setCoverCropSource(""); }}
                  />
                ) : item.photo ? (
                  <div className="overflow-hidden rounded-[8px] border border-line bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.photo} alt="Предпросмотр обложки" className="aspect-video w-full object-cover" />
                  </div>
                ) : (
                  <div className="grid aspect-video place-items-center rounded-[8px] border border-dashed border-line bg-white px-4 text-center text-sm text-slate-400">Обложка пока не выбрана</div>
                )}
              </div>
              <div className="grid min-w-0 gap-3 rounded-[8px] border border-line bg-mist p-4">
                <h2 className="font-semibold text-ink">Публикация</h2>
                <Field label="Статус новости">
                  <select value={item.status} onChange={(event) => update("status", event.target.value as NewsStatus)} className="focus-ring min-w-0 rounded-[8px] border border-line bg-white px-3 py-3">
                    <option value="draft">Черновик</option>
                    <option value="published">Опубликована</option>
                    <option value="archived">Архив</option>
                  </select>
                </Field>
                {saveError ? <p className="rounded-[8px] bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{saveError}</p> : null}
                <button className="focus-ring flex items-center justify-center gap-2 rounded-[8px] bg-ink px-4 py-3 font-semibold text-white">
                  <Save size={18} />
                  Сохранить новость
                </button>
                {saved ? <p className="flex items-center justify-center gap-2 rounded-[8px] bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-700"><CheckCircle2 size={17} /> Новость сохранена</p> : null}
                <Link href="/admin?tab=news" className="focus-ring flex items-center justify-center rounded-[8px] border border-line bg-white px-4 py-3 text-sm font-semibold text-ink">
                  Вернуться к новостям
                </Link>
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

function uniqueOptions(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function canonicalNewsClass(value: string, options: string[]) {
  if (value === "Все") return value;
  return options.find((option) => sameNewsClass(option, value)) || value;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid min-w-0 gap-1 text-sm font-semibold text-slate-600"><span>{label}</span>{children}</label>;
}

function withNewsBlocks(item: NewsItem): NewsItem {
  return { ...item, contentBlocks: normalizeNewsBlocks(item.contentBlocks, item.text) };
}

async function uploadNewsMedia(item: NewsItem): Promise<NewsItem> {
  let photo = item.photo;
  if (photo.startsWith("data:")) {
    const uploaded = await uploadMediaFile(await dataUrlToFile(photo, `${item.slug}-cover.jpg`), {
      scope: "news",
      slug: item.slug,
      variant: "cover"
    });
    if (!uploaded?.url) throw new Error("Хранилище медиа не подключено. Обложка не сохранена, чтобы не перегружать базу сайта.");
    photo = uploaded.url;
  }

  const contentBlocks = await Promise.all((item.contentBlocks || []).map(async (block, blockIndex) => {
    if (block.kind !== "gallery" || !block.gallery) return block;
    const images = await Promise.all(block.gallery.images.map(async (image, imageIndex) => {
      if (!image.src.startsWith("data:")) return image;
      const uploaded = await uploadMediaFile(await dataUrlToFile(image.src, image.fileName || `gallery-${blockIndex + 1}-${imageIndex + 1}.jpg`), {
        scope: "news",
        slug: item.slug,
        variant: `gallery-${blockIndex + 1}-${imageIndex + 1}`
      });
      if (!uploaded?.url) throw new Error("Хранилище медиа не подключено. Фотографии галереи не сохранены, чтобы не перегружать базу сайта.");
      return { ...image, src: uploaded.url, fileName: uploaded.name };
    }));
    return { ...block, gallery: { ...block.gallery, images } };
  }));

  return { ...item, photo, contentBlocks, text: textFromNewsBlocks(contentBlocks) };
}

async function dataUrlToFile(dataUrl: string, name: string) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], name, { type: blob.type || "image/jpeg" });
}

function createNewsDraft(): NewsItem {
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const id = `news-${Date.now()}`;
  return {
    id,
    slug: id,
    date,
    title: "",
    text: "",
    className: "Все",
    category: "Школьное событие",
    tags: [],
    photo: "",
    author: "",
    status: "draft",
    contentBlocks: []
  };
}
