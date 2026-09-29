"use client";

import { Check, Crop, X } from "lucide-react";
import { useState } from "react";

type CropSettings = {
  zoom: number;
  x: number;
  y: number;
};

export function NewsCoverCropper({
  source,
  onApply,
  onCancel
}: {
  source: string;
  onApply: (dataUrl: string) => void;
  onCancel: () => void;
}) {
  const [crop, setCrop] = useState<CropSettings>({ zoom: 1, x: 0, y: 0 });
  const [busy, setBusy] = useState(false);

  async function apply() {
    setBusy(true);
    try {
      onApply(await cropNewsCoverToDataUrl(source, crop));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 rounded-[8px] border border-apple/30 bg-[var(--accent-soft)] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink"><Crop size={17} /> Подгонка обложки 16:9</p>
        <button type="button" onClick={onCancel} title="Отменить обрезку" aria-label="Отменить обрезку" className="focus-ring grid size-9 place-items-center rounded-[6px] border border-line bg-white text-slate-600"><X size={17} /></button>
      </div>

      <div className="aspect-video overflow-hidden rounded-[8px] border border-line bg-white shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={source}
          alt="Предпросмотр обложки"
          className="h-full w-full object-cover"
          style={{ objectPosition: `${50 + crop.x}% ${50 + crop.y}%`, transform: `scale(${crop.zoom})` }}
        />
      </div>

      <CropSlider label="Масштаб" min={1} max={2.5} step={0.05} value={crop.zoom} onChange={(zoom) => setCrop((current) => ({ ...current, zoom }))} />
      <CropSlider label="Сдвиг по горизонтали" min={-50} max={50} step={1} value={crop.x} onChange={(x) => setCrop((current) => ({ ...current, x }))} />
      <CropSlider label="Сдвиг по вертикали" min={-50} max={50} step={1} value={crop.y} onChange={(y) => setCrop((current) => ({ ...current, y }))} />

      <button type="button" onClick={apply} disabled={busy} className="focus-ring flex items-center justify-center gap-2 rounded-[8px] bg-ink px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
        <Check size={17} />
        {busy ? "Подготавливаем..." : "Применить обрезку"}
      </button>
    </div>
  );
}

function CropSlider({ label, min, max, step, value, onChange }: { label: string; min: number; max: number; step: number; value: number; onChange: (value: number) => void }) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-slate-600">
      <span className="flex items-center justify-between gap-2"><span>{label}</span><span>{value}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full" />
    </label>
  );
}

function cropNewsCoverToDataUrl(source: string, crop: CropSettings): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const output = { width: 1280, height: 720 };
        const aspect = output.width / output.height;
        const zoom = clamp(crop.zoom, 1, 2.5);
        const imageAspect = image.naturalWidth / image.naturalHeight;
        const baseWidth = imageAspect > aspect ? image.naturalHeight * aspect : image.naturalWidth;
        const baseHeight = imageAspect > aspect ? image.naturalHeight : image.naturalWidth / aspect;
        const sourceWidth = baseWidth / zoom;
        const sourceHeight = baseHeight / zoom;
        const maxX = Math.max(0, image.naturalWidth - sourceWidth);
        const maxY = Math.max(0, image.naturalHeight - sourceHeight);
        const sourceX = clamp((image.naturalWidth - sourceWidth) / 2 + (crop.x / 100) * maxX, 0, maxX);
        const sourceY = clamp((image.naturalHeight - sourceHeight) / 2 + (crop.y / 100) * maxY, 0, maxY);
        const canvas = document.createElement("canvas");
        canvas.width = output.width;
        canvas.height = output.height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas is unavailable");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, output.width, output.height);
        context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, output.width, output.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => reject(new Error("Не удалось прочитать изображение."));
    image.src = source;
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
