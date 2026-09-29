"use client";

import type { NewsContentBlock, NewsGalleryAlign, NewsGalleryImage, NewsGalleryLayout, NewsGalleryWidth } from "@/lib/types";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Copy, Images, Plus, Trash2, Type } from "lucide-react";
import type { ChangeEvent } from "react";
import { RichTextEditor } from "./rich-text-editor";

export function NewsContentBuilder({ blocks, onChange }: { blocks: NewsContentBlock[]; onChange: (blocks: NewsContentBlock[]) => void }) {
  function addTextBlock() {
    onChange([...blocks, createTextBlock()]);
  }

  function addGalleryBlock() {
    onChange([...blocks, createGalleryBlock()]);
  }

  function replaceBlock(index: number, block: NewsContentBlock) {
    onChange(blocks.map((item, itemIndex) => itemIndex === index ? block : item));
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function duplicateBlock(index: number) {
    const source = blocks[index];
    const copy: NewsContentBlock = {
      ...source,
      id: newId("news-block"),
      gallery: source.gallery ? {
        ...source.gallery,
        images: source.gallery.images.map((image) => ({ ...image, id: newId("news-image") }))
      } : undefined
    };
    const next = [...blocks];
    next.splice(index + 1, 0, copy);
    onChange(next);
  }

  function removeBlock(index: number) {
    if (blocks.length === 1) {
      onChange([createTextBlock()]);
      return;
    }
    onChange(blocks.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2 rounded-[8px] border border-line bg-white p-3">
        <span className="mr-1 text-sm font-semibold text-slate-600">Добавить в статью:</span>
        <button type="button" onClick={addTextBlock} className="focus-ring flex items-center gap-2 rounded-[8px] bg-ink px-3 py-2 text-sm font-semibold text-white"><Type size={16} /> Текст</button>
        <button type="button" onClick={addGalleryBlock} className="focus-ring flex items-center gap-2 rounded-[8px] bg-ink px-3 py-2 text-sm font-semibold text-white"><Images size={16} /> Галерея</button>
      </div>

      {blocks.map((block, index) => (
        <section key={block.id} className="min-w-0 overflow-hidden rounded-[8px] border border-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-mist px-3 py-2">
            <div>
              <p className="text-sm font-semibold text-ink">{index + 1}. {block.kind === "gallery" ? "Галерея изображений" : "Текстовый блок"}</p>
              <p className="text-xs text-slate-500">{block.kind === "gallery" ? "Фотографии, подписи и вариант показа" : "Абзацы, заголовки, списки, цитаты и ссылки"}</p>
            </div>
            <div className="flex items-center gap-1">
              <BlockButton title="Переместить выше" disabled={index === 0} onClick={() => moveBlock(index, -1)}><ArrowUp size={16} /></BlockButton>
              <BlockButton title="Переместить ниже" disabled={index === blocks.length - 1} onClick={() => moveBlock(index, 1)}><ArrowDown size={16} /></BlockButton>
              <BlockButton title="Создать копию блока" onClick={() => duplicateBlock(index)}><Copy size={16} /></BlockButton>
              <BlockButton title="Удалить блок" danger onClick={() => removeBlock(index)}><Trash2 size={16} /></BlockButton>
            </div>
          </div>

          <div className="min-w-0 p-3">
            {block.kind === "text" ? (
              <RichTextEditor
                value={block.text || ""}
                onChange={(text) => replaceBlock(index, { ...block, text })}
                label="Содержание текстового блока"
                placeholder="Введите текст статьи..."
                minHeight={240}
              />
            ) : (
              <GalleryBlockEditor block={block} onChange={(next) => replaceBlock(index, next)} />
            )}
          </div>
        </section>
      ))}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={addTextBlock} className="focus-ring flex items-center gap-2 rounded-[8px] border border-line bg-white px-3 py-2 text-sm font-semibold text-ink"><Plus size={16} /> Добавить текст</button>
        <button type="button" onClick={addGalleryBlock} className="focus-ring flex items-center gap-2 rounded-[8px] border border-line bg-white px-3 py-2 text-sm font-semibold text-ink"><Plus size={16} /> Добавить галерею</button>
      </div>
    </div>
  );
}

function GalleryBlockEditor({ block, onChange }: { block: NewsContentBlock; onChange: (block: NewsContentBlock) => void }) {
  const gallery = block.gallery || defaultGallery();

  function updateGallery(patch: Partial<typeof gallery>) {
    onChange({ ...block, gallery: { ...gallery, ...patch } });
  }

  async function addImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const images = await Promise.all(files.map(async (file) => ({
      id: newId("news-image"),
      src: await resizeImageFile(file),
      caption: "",
      fileName: safeImageName(file.name)
    })));
    updateGallery({ images: [...gallery.images, ...images] });
    event.target.value = "";
  }

  function updateImage(index: number, patch: Partial<NewsGalleryImage>) {
    updateGallery({ images: gallery.images.map((image, imageIndex) => imageIndex === index ? { ...image, ...patch } : image) });
  }

  function moveImage(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= gallery.images.length) return;
    const images = [...gallery.images];
    [images[index], images[target]] = [images[target], images[index]];
    updateGallery({ images });
  }

  function removeImage(index: number) {
    updateGallery({ images: gallery.images.filter((_, imageIndex) => imageIndex !== index) });
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        <LabeledSelect label="Вид галереи" value={gallery.layout} onChange={(value) => updateGallery({ layout: value as NewsGalleryLayout })} options={[["grid", "Ровная сетка"], ["mosaic", "Мозаика"], ["filmstrip", "Лента кадров"], ["slider", "Листалка с миниатюрами"]]} />
        <LabeledSelect label="Ширина" value={gallery.width} onChange={(value) => updateGallery({ width: value as NewsGalleryWidth })} options={[["narrow", "Узкая"], ["content", "По ширине статьи"], ["wide", "Широкая"]]} />
        <LabeledSelect label="Выравнивание" value={gallery.align} onChange={(value) => updateGallery({ align: value as NewsGalleryAlign })} options={[["left", "Слева"], ["center", "По центру"], ["right", "Справа"]]} />
      </div>

      <label className="focus-ring flex cursor-pointer items-center justify-center gap-2 rounded-[8px] border border-dashed border-apple bg-[var(--accent-soft)] px-4 py-3 text-sm font-semibold text-apple">
        <Images size={18} />
        Добавить фотографии
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addImages} className="sr-only" />
      </label>

      {gallery.images.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {gallery.images.map((image, index) => (
            <div key={image.id} className="overflow-hidden rounded-[8px] border border-line bg-mist">
              <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.src} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="grid gap-2 p-2">
                <input value={image.caption} onChange={(event) => updateImage(index, { caption: event.target.value })} placeholder="Подпись к фотографии" className="focus-ring min-w-0 rounded-[6px] border border-line bg-white px-3 py-2 text-sm" />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-1">
                    <BlockButton title="Переместить фотографию влево" disabled={index === 0} onClick={() => moveImage(index, -1)}><ArrowLeft size={16} /></BlockButton>
                    <BlockButton title="Переместить фотографию вправо" disabled={index === gallery.images.length - 1} onClick={() => moveImage(index, 1)}><ArrowRight size={16} /></BlockButton>
                  </div>
                  <BlockButton title="Удалить фотографию" danger onClick={() => removeImage(index)}><Trash2 size={16} /></BlockButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-[8px] bg-mist px-4 py-5 text-center text-sm text-slate-500">В галерее пока нет фотографий.</p>
      )}
    </div>
  );
}

function BlockButton({ title, disabled, danger, onClick, children }: { title: string; disabled?: boolean; danger?: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" title={title} aria-label={title} disabled={disabled} onClick={onClick} className={`focus-ring grid size-9 place-items-center rounded-[6px] border border-line bg-white transition disabled:cursor-not-allowed disabled:opacity-35 ${danger ? "text-rose-600 hover:bg-rose-50" : "text-slate-600 hover:text-apple"}`}>{children}</button>;
}

function LabeledSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-600">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="focus-ring min-w-0 rounded-[8px] border border-line bg-white px-3 py-2.5 text-ink">
        {options.map(([optionValue, title]) => <option key={optionValue} value={optionValue}>{title}</option>)}
      </select>
    </label>
  );
}

export function normalizeNewsBlocks(blocks: NewsContentBlock[] | undefined, legacyText: string): NewsContentBlock[] {
  if (Array.isArray(blocks) && blocks.length) {
    return blocks.map((block) => block.kind === "gallery"
      ? { ...block, id: block.id || newId("news-block"), gallery: normalizeGallery(block.gallery) }
      : { ...block, id: block.id || newId("news-block"), kind: "text", text: block.text || "" });
  }
  return [{ ...createTextBlock(), text: legacyText || "" }];
}

export function textFromNewsBlocks(blocks: NewsContentBlock[]) {
  return blocks.filter((block) => block.kind === "text").map((block) => block.text || "").filter(Boolean).join("\n");
}

function createTextBlock(): NewsContentBlock {
  return { id: newId("news-block"), kind: "text", text: "" };
}

function createGalleryBlock(): NewsContentBlock {
  return { id: newId("news-block"), kind: "gallery", gallery: defaultGallery() };
}

function defaultGallery() {
  return { layout: "grid" as const, width: "content" as const, align: "center" as const, images: [] as NewsGalleryImage[] };
}

function normalizeGallery(gallery: NewsContentBlock["gallery"]) {
  const fallback = defaultGallery();
  return {
    layout: gallery?.layout || fallback.layout,
    width: gallery?.width || fallback.width,
    align: gallery?.align || fallback.align,
    images: Array.isArray(gallery?.images) ? gallery.images.map((image) => ({ ...image, id: image.id || newId("news-image"), caption: image.caption || "" })) : []
  };
}

function resizeImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxSide = 1800;
        const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext("2d");
        if (!context) return reject(new Error("Не удалось обработать изображение."));
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.84));
      };
      image.onerror = () => reject(new Error(`Не удалось прочитать файл ${file.name}.`));
      image.src = String(reader.result || "");
    };
    reader.onerror = () => reject(new Error(`Не удалось прочитать файл ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

function safeImageName(value: string) {
  const base = value.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-zа-яё0-9]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 60) || `photo-${Date.now()}`;
  return `${base}.jpg`;
}

function newId(prefix: string) {
  return `${prefix}-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}
