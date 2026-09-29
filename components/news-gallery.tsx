"use client";

import type { NewsContentBlock, NewsGalleryImage } from "@/lib/types";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import { useEffect, useState } from "react";

export function NewsGallery({ block }: { block: NewsContentBlock }) {
  const gallery = block.gallery;
  const images = gallery?.images || [];
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    if (active >= images.length) setActive(Math.max(0, images.length - 1));
  }, [active, images.length]);

  if (!gallery || !images.length) return null;
  const widthClass = gallery.width === "narrow" ? "max-w-2xl" : gallery.width === "wide" ? "max-w-6xl" : "max-w-4xl";
  const alignClass = gallery.align === "left" ? "mr-auto" : gallery.align === "right" ? "ml-auto" : "mx-auto";

  return (
    <>
      <section className={`w-full ${widthClass} ${alignClass}`}>
        {gallery.layout === "slider" ? (
          <SliderGallery images={images} active={active} setActive={setActive} open={setLightbox} />
        ) : gallery.layout === "filmstrip" ? (
          <div className="flex snap-x gap-3 overflow-x-auto pb-3">
            {images.map((image, index) => (
              <figure key={image.id} className="w-[78%] shrink-0 snap-center overflow-hidden rounded-[8px] border border-line bg-white shadow-sm sm:w-[46%] lg:w-[34%]">
                <GalleryImage image={image} onClick={() => setLightbox(index)} className="aspect-[4/3]" />
                <Caption value={image.caption} />
              </figure>
            ))}
          </div>
        ) : (
          <div className={gallery.layout === "mosaic" ? "grid auto-rows-[170px] gap-3 sm:grid-cols-2 lg:grid-cols-3" : "grid gap-3 sm:grid-cols-2"}>
            {images.map((image, index) => (
              <figure key={image.id} className={`overflow-hidden rounded-[8px] border border-line bg-white shadow-sm ${gallery.layout === "mosaic" && index === 0 && images.length > 2 ? "sm:col-span-2 sm:row-span-2" : ""}`}>
                <GalleryImage image={image} onClick={() => setLightbox(index)} className={gallery.layout === "mosaic" ? "h-full min-h-[170px]" : "aspect-[4/3]"} />
                {gallery.layout !== "mosaic" ? <Caption value={image.caption} /> : null}
              </figure>
            ))}
          </div>
        )}
      </section>

      {lightbox !== null ? (
        <div role="dialog" aria-modal="true" aria-label="Просмотр фотографии" className="fixed inset-0 z-[100] grid place-items-center bg-black/85 p-4" onClick={() => setLightbox(null)}>
          <button type="button" onClick={() => setLightbox(null)} title="Закрыть" aria-label="Закрыть" className="focus-ring absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-white text-ink"><X size={22} /></button>
          {images.length > 1 ? (
            <>
              <LightboxArrow direction="left" onClick={() => setLightbox((current) => current === null ? 0 : (current - 1 + images.length) % images.length)} />
              <LightboxArrow direction="right" onClick={() => setLightbox((current) => current === null ? 0 : (current + 1) % images.length)} />
            </>
          ) : null}
          <figure className="max-h-[90vh] max-w-6xl" onClick={(event) => event.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[lightbox].src} alt={images[lightbox].caption || "Фотография из галереи"} className="max-h-[82vh] max-w-full rounded-[8px] object-contain" />
            {images[lightbox].caption ? <figcaption className="mt-3 text-center text-sm text-white">{images[lightbox].caption}</figcaption> : null}
          </figure>
        </div>
      ) : null}
    </>
  );
}

function SliderGallery({ images, active, setActive, open }: { images: NewsGalleryImage[]; active: number; setActive: (index: number) => void; open: (index: number) => void }) {
  const image = images[active];
  return (
    <div className="grid gap-3">
      <div className="relative overflow-hidden rounded-[8px] border border-line bg-slate-100 shadow-sm">
        <GalleryImage image={image} onClick={() => open(active)} className="aspect-video" />
        {images.length > 1 ? (
          <>
            <SliderArrow direction="left" onClick={() => setActive((active - 1 + images.length) % images.length)} />
            <SliderArrow direction="right" onClick={() => setActive((active + 1) % images.length)} />
          </>
        ) : null}
      </div>
      <Caption value={image.caption} />
      {images.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((thumb, index) => (
            <button type="button" key={thumb.id} onClick={() => setActive(index)} title={`Открыть фотографию ${index + 1}`} className={`focus-ring h-16 w-24 shrink-0 overflow-hidden rounded-[6px] border-2 ${active === index ? "border-apple" : "border-transparent"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb.src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function GalleryImage({ image, onClick, className }: { image: NewsGalleryImage; onClick: () => void; className: string }) {
  return (
    <button type="button" onClick={onClick} className={`focus-ring group relative block w-full overflow-hidden bg-slate-100 ${className}`} title="Открыть фотографию">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.src} alt={image.caption || "Фотография из галереи"} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
      <span className="absolute bottom-3 right-3 grid size-9 place-items-center rounded-full bg-black/65 text-white opacity-0 transition group-hover:opacity-100"><Images size={17} /></span>
    </button>
  );
}

function Caption({ value }: { value: string }) {
  return value ? <figcaption className="px-3 py-2 text-sm leading-6 text-slate-600">{value}</figcaption> : null;
}

function SliderArrow({ direction, onClick }: { direction: "left" | "right"; onClick: () => void }) {
  const Icon = direction === "left" ? ChevronLeft : ChevronRight;
  return <button type="button" onClick={onClick} title={direction === "left" ? "Предыдущая фотография" : "Следующая фотография"} aria-label={direction === "left" ? "Предыдущая фотография" : "Следующая фотография"} className={`focus-ring absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow-md ${direction === "left" ? "left-3" : "right-3"}`}><Icon size={22} /></button>;
}

function LightboxArrow({ direction, onClick }: { direction: "left" | "right"; onClick: () => void }) {
  const Icon = direction === "left" ? ChevronLeft : ChevronRight;
  return <button type="button" onClick={(event) => { event.stopPropagation(); onClick(); }} title={direction === "left" ? "Предыдущая фотография" : "Следующая фотография"} aria-label={direction === "left" ? "Предыдущая фотография" : "Следующая фотография"} className={`focus-ring absolute top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white text-ink ${direction === "left" ? "left-3" : "right-3"}`}><Icon size={24} /></button>;
}
