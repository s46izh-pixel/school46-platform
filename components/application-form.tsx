"use client";

import { actions, classes } from "@/lib/mock-data";
import type { EventItem, ScheduleLesson } from "@/lib/types";
import { CheckCircle2, Paperclip, Send } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

export function ApplicationForm({ event: selectedEvent }: { event?: EventItem }) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [classOptions, setClassOptions] = useState(() => sortClasses(classes));

  useEffect(() => {
    fetch("/api/schedule", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { lessons?: ScheduleLesson[] }) => {
        const scheduleClasses = data.lessons?.map((lesson) => lesson.className) ?? [];
        setClassOptions(sortClasses([...scheduleClasses, ...classes]));
      })
      .catch(() => setClassOptions(sortClasses(classes)));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const form = new FormData(event.currentTarget);
      const files = form.getAll("files").filter((item): item is File => item instanceof File && Boolean(item.name));
      const attachments = await Promise.all(files.map(fileToAttachment));
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
      <label className="grid gap-2 rounded-[8px] border border-dashed border-line bg-mist p-4 text-sm font-medium text-slate-600">
        <span className="flex items-center gap-2 font-semibold text-ink"><Paperclip size={17} /> Прикрепить файлы</span>
        <input name="files" type="file" multiple className="focus-ring rounded-[8px] border border-line bg-white px-3 py-2" />
        <span className="text-xs leading-5 text-slate-500">Можно приложить положение, согласие, работу участника, изображение или архив. В текущем режиме сохраняются названия файлов, загрузку в облако подключим отдельно.</span>
      </label>
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

function sortClasses(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((first, second) => {
    const firstNumber = Number(first.match(/\d{1,2}/)?.[0] ?? 0);
    const secondNumber = Number(second.match(/\d{1,2}/)?.[0] ?? 0);
    if (firstNumber !== secondNumber) return firstNumber - secondNumber;
    return first.localeCompare(second, "ru", { numeric: true });
  });
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

async function fileToAttachment(file: File) {
  const attachment = { name: file.name, size: file.size, type: file.type, dataUrl: undefined as string | undefined };
  if (file.type.startsWith("image/") && file.size <= 700_000) {
    try {
      attachment.dataUrl = await readFileAsDataUrl(file);
    } catch {
      attachment.dataUrl = undefined;
    }
  }
  return attachment;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
