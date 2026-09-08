"use client";

import { actions, classes } from "@/lib/mock-data";
import { uniqueClasses } from "@/lib/class-utils";
import type { EventItem, ScheduleLesson } from "@/lib/types";
import { CheckCircle2, Paperclip, Send } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

export function ApplicationForm({ event: selectedEvent }: { event?: EventItem }) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [classOptions, setClassOptions] = useState(() => uniqueClasses(classes, classes));
  const allowedFiles = parseAllowedFiles(selectedEvent?.allowedFiles);
  const allowFiles = selectedEvent?.allowFiles !== false;

  useEffect(() => {
    fetch("/api/schedule", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { lessons?: ScheduleLesson[] }) => {
        const scheduleClasses = data.lessons?.map((lesson) => lesson.className) ?? [];
        setClassOptions(uniqueClasses(scheduleClasses, classes));
      })
      .catch(() => setClassOptions(uniqueClasses(classes, classes)));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const form = new FormData(event.currentTarget);
      const files = form.getAll("files").filter((item): item is File => item instanceof File && Boolean(item.name));
      const checkedFiles = validateFiles(files, allowedFiles);
      if (!checkedFiles.ok) {
        setError(checkedFiles.message);
        return;
      }
      const attachments = await Promise.all(files.map((file) => fileToAttachment(file, allowedFiles)));
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...Object.fromEntries(form.entries()),
          files: attachments,
          applicationId: crypto.randomUUID(),
          eventId: selectedEvent?.id ?? "",
          eventTitle: selectedEvent?.title ?? form.get("contest"),
          eventType: selectedEvent?.type ?? "contest",
          createdAt: new Date().toISOString()
        })
      });
      if (!response.ok) {
        setError("Не удалось отправить заявку. Попробуйте ещё раз или сообщите администратору.");
        return;
      }
      setSent(true);
      event.currentTarget.reset();
    } catch {
      setError("Не удалось отправить заявку. Попробуйте ещё раз или сообщите администратору.");
    }
  }

  if (sent) {
    return (
      <div className="rounded-[8px] border border-mint/30 bg-emerald-50 p-6 text-emerald-900">
        <CheckCircle2 className="mb-3" size={32} />
        <h2 className="text-2xl font-semibold">Заявка отправлена</h2>
        <p className="mt-2 text-sm leading-6">Мы записали заявку. Администратор увидит её в разделе заявок.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-[8px] border border-line bg-white p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2">
        {selectedEvent ? (
          <input type="hidden" name="contest" value={selectedEvent.title} />
        ) : (
          <Field as="select" name="contest" label="Конкурс" options={actions.map((item) => item.title)} />
        )}
        <Field as="select" name="className" label="Класс" options={classOptions} />
        {resolveFields(selectedEvent).map((field) => <DynamicField key={field.name} field={field} />)}
      </div>
      {allowFiles ? (
        <label className="grid gap-2 rounded-[8px] border border-dashed border-line bg-mist p-4 text-sm font-medium text-slate-600">
          <span className="flex items-center gap-2 font-semibold text-ink"><Paperclip size={17} /> Прикрепить файлы</span>
          <input name="files" type="file" multiple accept={acceptAttribute(allowedFiles)} className="focus-ring rounded-[8px] border border-line bg-white px-3 py-2" />
          <span className="text-xs leading-5 text-slate-500">
            Разрешены форматы: {allowedFiles.join(", ")}. Картинки автоматически сжимаются и сохраняются с безопасным именем.
          </span>
        </label>
      ) : null}
      <label className="grid gap-2 text-sm font-medium text-slate-600">
        Комментарий
        <textarea name="comment" rows={4} className="focus-ring rounded-[8px] border border-line px-3 py-2" />
      </label>
      <label className="flex items-start gap-3 text-sm text-slate-600">
        <input required name="consent" type="checkbox" className="mt-1" />
        Даю согласие на обработку данных для участия в конкурсе
      </label>
      {error ? <p className="rounded-[8px] bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}
      <button className="focus-ring flex items-center justify-center gap-2 rounded-[8px] bg-ink px-5 py-3 font-semibold text-white">
        <Send size={18} />
        Отправить заявку
      </button>
    </form>
  );
}

function Field({ label, name, as, options }: { label: string; name: string; as?: "select"; options?: string[] }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-600">
      {label}
      {as === "select" ? (
        <select name={name} className="focus-ring rounded-[8px] border border-line bg-white px-3 py-2">
          {options?.map((item) => <option key={item}>{item}</option>)}
        </select>
      ) : (
        <input required name={name} className="focus-ring rounded-[8px] border border-line px-3 py-2" />
      )}
    </label>
  );
}

type DynamicFormField = {
  name: string;
  label: string;
  type?: "text" | "email" | "tel" | "url";
  required?: boolean;
};

const defaultFields: DynamicFormField[] = [
  { name: "student", label: "ФИО участника", required: true },
  { name: "mentor", label: "ФИО руководителя", required: true },
  { name: "nomination", label: "Номинация" },
  { name: "contact", label: "Контакт", required: true },
  { name: "workUrl", label: "Ссылка на работу", type: "url" }
];

const fieldLabels: Record<string, DynamicFormField> = {
  student: { name: "student", label: "ФИО участника", required: true },
  "фио участника": { name: "student", label: "ФИО участника", required: true },
  className: { name: "className", label: "Класс", required: true },
  "класс": { name: "className", label: "Класс", required: true },
  mentor: { name: "mentor", label: "ФИО руководителя", required: true },
  "педагог": { name: "mentor", label: "ФИО руководителя", required: true },
  "фио руководителя": { name: "mentor", label: "ФИО руководителя", required: true },
  nomination: { name: "nomination", label: "Номинация" },
  "номинация": { name: "nomination", label: "Номинация" },
  contact: { name: "contact", label: "Контакт", required: true },
  "контакт": { name: "contact", label: "Контакт", required: true },
  workUrl: { name: "workUrl", label: "Ссылка на работу", type: "url" },
  "ссылка на работу": { name: "workUrl", label: "Ссылка на работу", type: "url" }
};

function resolveFields(event?: EventItem) {
  const configured = event?.applicationFields?.filter((field) => !isBuiltInField(field));
  if (!configured?.length) return defaultFields;
  return configured.map((name) => fieldLabels[name] ?? fieldLabels[name.toLowerCase()] ?? { name, label: name });
}

function isBuiltInField(name: string) {
  return ["classname", "класс", "comment", "комментарий", "consent", "согласие"].includes(name.trim().toLowerCase());
}

function DynamicField({ field }: { field: DynamicFormField }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-600">
      {field.label}
      <input required={field.required} name={field.name} type={field.type ?? "text"} className="focus-ring rounded-[8px] border border-line px-3 py-2" />
    </label>
  );
}

async function fileToAttachment(file: File, allowedFiles: string[]) {
  if (file.type.startsWith("image/") && acceptsImage(allowedFiles)) {
    try {
      const image = await imageFileToAttachment(file, allowedFiles);
      return image;
    } catch {
      return safeFileAttachment(file);
    }
  }
  return safeFileAttachment(file);
}

function safeFileAttachment(file: File) {
  return { name: safeAttachmentName(file.name), size: file.size, type: file.type, dataUrl: undefined as string | undefined };
}

function parseAllowedFiles(value: string | undefined) {
  const values = (value || "pdf, docx, jpg, png, zip")
    .split(/[,;\s]+/)
    .map((item) => item.trim().replace(/^\./, "").toLowerCase())
    .filter(Boolean);
  return Array.from(new Set(values.length ? values : ["pdf", "docx", "jpg", "png", "zip"]));
}

function validateFiles(files: File[], allowedFiles: string[]) {
  const maxFiles = 5;
  const maxFileSize = 10 * 1024 * 1024;
  if (files.length > maxFiles) {
    return { ok: false as const, message: `Можно прикрепить не больше ${maxFiles} файлов.` };
  }
  const invalid = files.find((file) => !isAllowedFile(file, allowedFiles));
  if (invalid) {
    return { ok: false as const, message: `Файл "${invalid.name}" не подходит. Разрешены форматы: ${allowedFiles.join(", ")}.` };
  }
  const heavy = files.find((file) => file.size > maxFileSize);
  if (heavy) {
    return { ok: false as const, message: `Файл "${heavy.name}" слишком большой. Максимум 10 МБ.` };
  }
  return { ok: true as const };
}

function isAllowedFile(file: File, allowedFiles: string[]) {
  const extension = fileExtension(file.name);
  if (allowedFiles.includes(extension)) return true;
  return file.type.startsWith("image/") && acceptsImage(allowedFiles);
}

function acceptsImage(allowedFiles: string[]) {
  return Boolean(imageTarget(allowedFiles));
}

function acceptAttribute(allowedFiles: string[]) {
  return allowedFiles.map((item) => `.${item}`).join(",");
}

function fileExtension(name: string) {
  return name.split(".").pop()?.toLowerCase() || "";
}

function safeAttachmentName(name: string, extension = fileExtension(name) || "file") {
  const base = name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[а-яё]/g, (letter) => translit[letter] ?? "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || `file-${Date.now()}`;
  return `${base}.${extension}`;
}

function imageFileToAttachment(file: File, allowedFiles: string[]) {
  return new Promise<{ name: string; size: number; type: string; dataUrl?: string }>((resolve, reject) => {
    const target = imageTarget(allowedFiles);
    if (!target) {
      reject();
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        try {
          const maxSize = 1200;
          const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
          const width = Math.max(1, Math.round(image.naturalWidth * scale));
          const height = Math.max(1, Math.round(image.naturalHeight * scale));
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Canvas is unavailable");
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, width, height);
          context.drawImage(image, 0, 0, width, height);
          const dataUrl = canvas.toDataURL(target.mime, target.quality);
          resolve({
            name: safeAttachmentName(file.name, target.extension),
            size: Math.round((dataUrl.length * 3) / 4),
            type: target.mime,
            dataUrl
          });
        } catch {
          reject();
        }
      };
      image.onerror = () => reject();
      image.src = String(reader.result || "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function imageTarget(allowedFiles: string[]) {
  if (allowedFiles.includes("jpg") || allowedFiles.includes("jpeg")) return { extension: "jpg", mime: "image/jpeg", quality: 0.72 };
  if (allowedFiles.includes("png")) return { extension: "png", mime: "image/png", quality: undefined };
  if (allowedFiles.includes("webp")) return { extension: "webp", mime: "image/webp", quality: 0.72 };
  return null;
}

const translit: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "c",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya"
};
