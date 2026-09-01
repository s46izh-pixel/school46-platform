"use client";

import { Card, SectionTitle } from "@/components/card";
import { getAdminStore, patchAdminStore } from "@/lib/admin-store-client";
import { classes } from "@/lib/mock-data";
import type { EventItem, ScheduleLesson } from "@/lib/types";
import { ArrowLeft, CheckCircle2, Copy, Download, Eye, EyeOff, FileUp, ImageIcon, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

const eventCategories = [
  "Мероприятие",
  "Акция",
  "Конкурс",
  "Линейка",
  "Олимпиада",
  "Викторина",
  "Спорт",
  "Профориентация",
  "Безопасность",
  "Педагогам",
  "Родителям",
  "Культура"
];

const statuses = [
  { value: "planned", label: "Запланировано" },
  { value: "active", label: "Идет" },
  { value: "finished", label: "Завершено" }
];

type PageContentBlock = {
  id: string;
  kind: "position" | "participation" | "materials" | "custom";
  title: string;
  text: string;
  items: string[];
  enabled: boolean;
};

const defaultPageBlocks: PageContentBlock[] = [
  {
    id: "position",
    kind: "position",
    title: "Положение о мероприятии",
    text: "Здесь будет подробное положение мероприятия: цель, сроки, участники, требования и порядок участия.",
    items: [],
    enabled: true
  },
  {
    id: "participation",
    kind: "participation",
    title: "Как принять участие",
    text: "Ознакомьтесь с условиями, подготовьте материалы и отправьте заявку через форму на этой странице, если приём заявок открыт.\nПроверьте дату, время и место проведения.\nПодготовьте ФИО участника, класс и контакт для связи.\nПри необходимости прикрепите файл или ссылку на работу.",
    items: [],
    enabled: true
  },
  {
    id: "materials",
    kind: "materials",
    title: "Материалы и изображения",
    text: "В этом блоке можно размещать афишу, положение, шаблоны документов, примеры работ и дополнительные изображения мероприятия.",
    items: ["Афиша мероприятия", "Положение / документ"],
    enabled: true
  }
];

const defaultForm = {
  title: "",
  category: "Мероприятие",
  startDate: "",
  endDate: "",
  time: "",
  place: "",
  classes: "",
  owner: "",
  status: "planned",
  slug: "",
  cover: "",
  coverFileName: "",
  published: true,
  autoHideDate: "",
  description: "",
  pageBlocks: JSON.stringify(defaultPageBlocks),
  pageMaterials: "",
  acceptApplications: true,
  deadline: "",
  applicationFields: "ФИО участника, класс, педагог, номинация, контакт, ссылка на работу",
  applicationButton: "Подать заявку",
  allowFiles: true,
  allowedFiles: "pdf, docx, jpg, png, zip",
  customFields: ""
};

type EventPageDraft = typeof defaultForm;

export default function NewEventPage() {
  const [form, setForm] = useState<EventPageDraft>(defaultForm);
  const [sourceMode, setSourceMode] = useState<"new" | "copy" | "edit">("new");
  const [sourceSlug, setSourceSlug] = useState("");
  const [saved, setSaved] = useState(false);
  const [classOptions, setClassOptions] = useState(() => sortClassNames(classes));
  const [classCategoryOptions, setClassCategoryOptions] = useState(defaultClassCategoryOptions);
  const pageBlocks = useMemo(() => parsePageBlocks(form.pageBlocks, form.description), [form.description, form.pageBlocks]);
  const selectedParticipantGroups = useMemo(() => splitParticipantGroups(form.classes), [form.classes]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const copy = params.get("copy");
    const edit = params.get("edit");

    if (copy) {
      getAdminStore().then((store) => {
        const draft = findSavedDraft(store.eventPages as EventPageDraft[], copy);
        setSourceMode("copy");
        setSourceSlug(copy);
        setForm((current) => ({
          ...(draft ?? current),
          slug: `${copy}-copy`,
          title: draft?.title ? `Копия: ${draft.title}` : "Копия мероприятия"
        }));
      });
      return;
    }

    if (edit) {
      getAdminStore().then((store) => {
        const draft = findSavedDraft(store.eventPages as EventPageDraft[], edit);
        setSourceMode("edit");
        setSourceSlug(edit);
        setForm((current) => ({ ...(draft ?? current), slug: edit }));
      });
    }
  }, []);

  useEffect(() => {
    fetch("/api/schedule", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { lessons?: ScheduleLesson[] }) => {
        setClassOptions(sortClassNames([...(data.lessons?.map((lesson) => lesson.className) ?? []), ...classes]));
      })
      .catch(() => setClassOptions(sortClassNames(classes)));

    fetch("/api/events", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: EventItem[]) => {
        const categories = data.flatMap((item) => splitParticipantGroups(item.classCategory));
        setClassCategoryOptions(uniqueValues([...defaultClassCategoryOptions, ...categories]));
      })
      .catch(() => setClassCategoryOptions(defaultClassCategoryOptions));
  }, []);

  const modeTitle = useMemo(() => {
    if (sourceMode === "copy") return "Создать копию мероприятия";
    if (sourceMode === "edit") return "Редактировать страницу мероприятия";
    return "Создать событие";
  }, [sourceMode]);

  function updateField(field: keyof EventPageDraft, value: string | boolean) {
    setSaved(false);
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateApplicationField(index: number, value: string) {
    const fields = applicationFieldList(form.applicationFields);
    fields[index] = value;
    updateField("applicationFields", fields.join(", "));
  }

  function addApplicationField() {
    updateField("applicationFields", [...applicationFieldList(form.applicationFields), "Новое поле"].join(", "));
  }

  function removeApplicationField(index: number) {
    const fields = applicationFieldList(form.applicationFields);
    if (fields.length <= 1) return;
    updateField("applicationFields", fields.filter((_, fieldIndex) => fieldIndex !== index).join(", "));
  }

  function savePageBlocks(blocks: PageContentBlock[]) {
    updateField("pageBlocks", JSON.stringify(blocks));
  }

  function updatePageBlock(id: string, patch: Partial<PageContentBlock>) {
    savePageBlocks(pageBlocks.map((block) => block.id === id ? { ...block, ...patch } : block));
  }

  function addPageBlock() {
    savePageBlocks([
      ...pageBlocks,
      {
        id: `block-${Date.now()}`,
        kind: "custom",
        title: "Новый блок",
        text: "",
        items: [],
        enabled: true
      }
    ]);
  }

  function removePageBlock(id: string) {
    savePageBlocks(pageBlocks.filter((block) => block.id !== id));
  }

  function toggleParticipantGroup(value: string) {
    const selected = selectedParticipantGroups.includes(value)
      ? selectedParticipantGroups.filter((item) => item !== value)
      : [...selectedParticipantGroups, value];
    updateField("classes", selected.join(", "));
  }

  function handleTitleChange(event: ChangeEvent<HTMLInputElement>) {
    const title = event.target.value;
    setSaved(false);
    setForm((current) => ({
      ...current,
      title,
      slug: current.slug || slugify(title)
    }));
  }

  async function handleCoverFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const cover = await imageFileToSquareDataUrl(file);
      setSaved(false);
      setForm((current) => ({
        ...current,
        cover,
        coverFileName: file.name
      }));
    } catch {
      window.alert("Не удалось подготовить картинку. Попробуйте выбрать другое изображение.");
    }
  }

  async function saveDraft(event: FormEvent) {
    event.preventDefault();
    const store = await getAdminStore();
    const savedDrafts = store.eventPages as EventPageDraft[];
    const nextDraft = { ...form, slug: form.slug || slugify(form.title) || `event-${Date.now()}` };
    const withoutCurrent = savedDrafts.filter((item) => item.slug !== nextDraft.slug);
    await patchAdminStore({ eventPages: [...withoutCurrent, nextDraft] });
    setForm(nextDraft);
    setSaved(true);
  }

  function downloadSettings() {
    const blob = new Blob([JSON.stringify(form, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${form.slug || "event-page"}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-mist">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link href="/admin?tab=events" className="rounded-[8px] bg-white px-4 py-2 text-sm font-semibold text-ink shadow-sm">Назад к мероприятиям</Link>
          {saved ? (
            <span className="flex items-center gap-2 rounded-[8px] bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
              <CheckCircle2 size={17} />
              Событие сохранено
            </span>
          ) : null}
        </div>

        <Card className="bg-white">
          <SectionTitle
            eyebrow="Мастерская событий"
            title={modeTitle}
            action={<Link href="/events" className="rounded-[8px] bg-mist px-4 py-3 text-sm font-semibold text-ink">Открыть афишу</Link>}
          />
          <p className="mb-5 rounded-[8px] bg-mist px-4 py-3 text-sm leading-6 text-slate-600">
            Эта страница создается вручную и не зависит от строк календаря. Здесь можно подготовить отдельную страницу мероприятия, положение, материалы и форму сбора заявок.
            {sourceSlug ? ` Основа: ${sourceSlug}.` : ""}
          </p>

          <form onSubmit={saveDraft} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="grid gap-5">
              <FormBlock title="Основная информация">
                <input value={form.title} onChange={handleTitleChange} placeholder="Название мероприятия" className="focus-ring rounded-[8px] border border-line bg-white px-3 py-3" />
                <div className="grid gap-3 md:grid-cols-2">
                  <select value={form.category} onChange={(event) => updateField("category", event.target.value)} className="focus-ring rounded-[8px] border border-line bg-white px-3 py-3">
                    {eventCategories.map((category) => <option key={category}>{category}</option>)}
                  </select>
                  <select value={form.status} onChange={(event) => updateField("status", event.target.value)} className="focus-ring rounded-[8px] border border-line bg-white px-3 py-3">
                    {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                  </select>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <input value={form.startDate} onChange={(event) => updateField("startDate", event.target.value)} type="date" className="focus-ring rounded-[8px] border border-line bg-white px-3 py-3" />
                  <input value={form.endDate} onChange={(event) => updateField("endDate", event.target.value)} type="date" className="focus-ring rounded-[8px] border border-line bg-white px-3 py-3" />
                  <input value={form.time} onChange={(event) => updateField("time", event.target.value)} placeholder="Время" className="focus-ring rounded-[8px] border border-line bg-white px-3 py-3" />
                </div>
                <label className="grid gap-2 text-sm font-semibold text-slate-600">
                  Автоматически скрыть с сайта после даты
                  <input value={form.autoHideDate} onChange={(event) => updateField("autoHideDate", event.target.value)} type="date" className="focus-ring rounded-[8px] border border-line bg-white px-3 py-3" />
                </label>
                <div className="grid gap-3 md:grid-cols-2">
                  <input value={form.place} onChange={(event) => updateField("place", event.target.value)} placeholder="Место проведения" className="focus-ring rounded-[8px] border border-line bg-white px-3 py-3" />
                  <input value={form.owner} onChange={(event) => updateField("owner", event.target.value)} placeholder="Ответственный" className="focus-ring rounded-[8px] border border-line bg-white px-3 py-3" />
                </div>
                <div className="grid gap-3 rounded-[8px] border border-line bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-600">Классы-участники</p>
                    <span className="rounded-[8px] bg-mist px-2 py-1 text-xs font-semibold text-slate-500">{selectedParticipantGroups.length || "не выбрано"}</span>
                  </div>
                  <MultiChoiceGroup title="Категории для фильтра" values={classCategoryOptions} selected={selectedParticipantGroups} onToggle={toggleParticipantGroup} />
                  <MultiChoiceGroup title="Классы из расписания" values={classOptions} selected={selectedParticipantGroups} onToggle={toggleParticipantGroup} compact />
                </div>
              </FormBlock>

              <FormBlock title="Страница мероприятия" icon={<ImageIcon size={18} />}>
                <input value={form.slug} onChange={(event) => updateField("slug", slugify(event.target.value))} placeholder="Короткий адрес страницы: konkurs-risunkov" className="focus-ring rounded-[8px] border border-line bg-white px-3 py-3" />
                <div className="grid gap-3 rounded-[8px] border border-line bg-white p-3">
                  <label className="grid gap-2 text-sm font-semibold text-slate-600">
                    Обложка или афиша
                    <input value={form.cover.startsWith("data:") ? "" : form.cover} onChange={(event) => updateField("cover", event.target.value)} placeholder="Ссылка на обложку или афишу" className="focus-ring rounded-[8px] border border-line bg-white px-3 py-3" />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-600">
                    Прикрепить картинку с компьютера
                    <input onChange={handleCoverFile} type="file" accept="image/*" className="focus-ring rounded-[8px] border border-line bg-white px-3 py-3" />
                  </label>
                  {form.cover ? (
                    <div className="overflow-hidden rounded-[8px] border border-line bg-mist">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={form.cover} alt="Предпросмотр обложки" className="h-48 w-full object-cover" />
                      {form.coverFileName ? <p className="px-3 py-2 text-xs font-semibold text-slate-500">{form.coverFileName}</p> : null}
                    </div>
                  ) : null}
                </div>
                <label className="grid gap-2 text-sm font-semibold text-slate-600">
                  Краткое описание для верхней части страницы
                  <textarea value={form.description} onChange={(event) => updateField("description", event.target.value)} rows={4} placeholder="Коротко: о чём мероприятие, для кого оно и зачем участвовать..." className="focus-ring rounded-[8px] border border-line bg-white px-3 py-3" />
                </label>
              </FormBlock>

              <FormBlock title="Блоки страницы">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm leading-6 text-slate-600">Редактируйте секции, которые увидят посетители на странице мероприятия.</p>
                  <button type="button" onClick={addPageBlock} className="focus-ring flex shrink-0 items-center gap-2 rounded-[8px] bg-ink px-3 py-2 text-sm font-semibold text-white">
                    <Plus size={17} />
                    Добавить
                  </button>
                </div>
                <div className="grid gap-3">
                  {pageBlocks.map((block) => (
                    <div key={block.id} className="grid gap-3 rounded-[8px] border border-line bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <select value={block.kind} onChange={(event) => updatePageBlock(block.id, { kind: event.target.value as PageContentBlock["kind"] })} className="focus-ring rounded-[8px] border border-line bg-white px-3 py-2 text-sm font-semibold text-slate-600">
                          <option value="position">Положение</option>
                          <option value="participation">Участие</option>
                          <option value="materials">Материалы</option>
                          <option value="custom">Свой блок</option>
                        </select>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => updatePageBlock(block.id, { enabled: !block.enabled })} className="focus-ring flex items-center gap-2 rounded-[8px] bg-mist px-3 py-2 text-sm font-semibold text-slate-600">
                            {block.enabled ? <EyeOff size={16} /> : <Eye size={16} />}
                            {block.enabled ? "Выключить" : "Включить"}
                          </button>
                          <button type="button" onClick={() => removePageBlock(block.id)} className="focus-ring grid h-10 w-10 place-items-center rounded-[8px] bg-rose-50 text-rose-700" aria-label="Удалить блок">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <input value={block.title} onChange={(event) => updatePageBlock(block.id, { title: event.target.value })} placeholder="Название блока" className="focus-ring rounded-[8px] border border-line bg-white px-3 py-3" />
                      <textarea value={block.text} onChange={(event) => updatePageBlock(block.id, { text: event.target.value })} rows={5} placeholder="Текст блока" className="focus-ring rounded-[8px] border border-line bg-white px-3 py-3" />
                      <textarea value={block.items.join("\n")} onChange={(event) => updatePageBlock(block.id, { items: splitLines(event.target.value) })} rows={3} placeholder="Дополнительные пункты или материалы, каждый с новой строки" className="focus-ring rounded-[8px] border border-line bg-white px-3 py-3" />
                    </div>
                  ))}
                </div>
              </FormBlock>
            </div>

            <aside className="grid content-start gap-5 lg:sticky lg:top-4 lg:self-start">
              <FormBlock title="Заявочная форма">
                <label className="flex items-center justify-between gap-3 text-sm text-slate-600">
                  Принимать заявки
                  <input checked={form.acceptApplications} onChange={(event) => updateField("acceptApplications", event.target.checked)} type="checkbox" />
                </label>
                <input value={form.deadline} onChange={(event) => updateField("deadline", event.target.value)} type="date" className="focus-ring rounded-[8px] border border-line bg-white px-3 py-3" />
                <div className="grid gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-600">Поля заявки</p>
                    <button type="button" onClick={addApplicationField} className="focus-ring grid h-9 w-9 place-items-center rounded-[8px] bg-white text-ink" aria-label="Добавить поле заявки">
                      <Plus size={17} />
                    </button>
                  </div>
                  {applicationFieldList(form.applicationFields).map((field, index) => (
                    <div key={index} className="grid grid-cols-[1fr_38px] gap-2">
                      <input value={field} onChange={(event) => updateApplicationField(index, event.target.value)} placeholder="Например: ФИО участника" className="focus-ring rounded-[8px] border border-line bg-white px-3 py-3" />
                      <button type="button" onClick={() => removeApplicationField(index)} disabled={applicationFieldList(form.applicationFields).length <= 1} className="focus-ring grid h-full min-h-12 place-items-center rounded-[8px] bg-white text-slate-500 disabled:opacity-40" aria-label="Удалить поле заявки">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <input value={form.applicationButton} onChange={(event) => updateField("applicationButton", event.target.value)} placeholder="Текст кнопки" className="focus-ring rounded-[8px] border border-line bg-white px-3 py-3" />
                <label className="flex items-center justify-between gap-3 text-sm text-slate-600">
                  Разрешить прикреплять файлы
                  <input checked={form.allowFiles} onChange={(event) => updateField("allowFiles", event.target.checked)} type="checkbox" />
                </label>
                <input value={form.allowedFiles} onChange={(event) => updateField("allowedFiles", event.target.value)} placeholder="Допустимые файлы" className="focus-ring rounded-[8px] border border-line bg-white px-3 py-3" />
                <textarea value={form.customFields} onChange={(event) => updateField("customFields", event.target.value)} rows={4} placeholder="Дополнительные поля формы, если нужны" className="focus-ring rounded-[8px] border border-line bg-white px-3 py-3" />
              </FormBlock>

              <FormBlock title="Действия">
                <button type="button" className="focus-ring flex items-center justify-center gap-2 rounded-[8px] bg-white px-4 py-3 font-semibold text-ink">
                  <Copy size={18} />
                  Создать копию
                </button>
                <button type="button" onClick={downloadSettings} className="focus-ring flex items-center justify-center gap-2 rounded-[8px] bg-white px-4 py-3 font-semibold text-ink">
                  <Download size={18} />
                  Скачать настройки
                </button>
                <button type="button" className="focus-ring flex items-center justify-center gap-2 rounded-[8px] bg-white px-4 py-3 font-semibold text-ink">
                  <FileUp size={18} />
                  Экспорт в Google документ
                </button>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  <Link href="/admin?tab=events" className="focus-ring flex items-center justify-center gap-2 rounded-[8px] bg-white px-4 py-3 font-semibold text-ink">
                    <ArrowLeft size={18} />
                    К мероприятиям
                  </Link>
                  <button className="focus-ring flex items-center justify-center gap-2 rounded-[8px] bg-ink px-4 py-3 font-semibold text-white">
                    <Save size={18} />
                    Сохранить страницу
                  </button>
                </div>
              </FormBlock>
            </aside>
          </form>
          {saved ? (
            <div className="fixed bottom-5 right-5 z-[130] flex max-w-sm items-center gap-2 rounded-[8px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-soft">
              <CheckCircle2 size={18} />
              Событие сохранено
            </div>
          ) : null}
        </Card>
      </div>
    </main>
  );
}

function FormBlock({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="grid gap-3 rounded-[8px] border border-line bg-mist p-4">
      <h2 className="flex items-center gap-2 text-base font-semibold text-ink">{icon}{title}</h2>
      {children}
    </section>
  );
}

function MultiChoiceGroup({
  title,
  values,
  selected,
  onToggle,
  compact
}: {
  title: string;
  values: string[];
  selected: string[];
  onToggle: (value: string) => void;
  compact?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <p className="text-xs font-semibold uppercase text-slate-500">{title}</p>
      <div className={`grid gap-2 ${compact ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3"}`}>
        {values.map((value) => {
          const active = selected.includes(value);
          return (
            <button
              key={value}
              type="button"
              onClick={() => onToggle(value)}
              className={`focus-ring rounded-[8px] border px-2 py-2 text-sm font-semibold transition ${active ? "border-apple bg-[var(--accent-soft)] text-apple" : "border-line bg-mist text-slate-600 hover:bg-white"}`}
            >
              {value}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[а-яё]/g, (letter) => translit[letter] ?? "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function findSavedDraft(drafts: EventPageDraft[], slug: string) {
  return drafts.find((item) => item.slug === slug);
}

function applicationFieldList(value: string) {
  const fields = value
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  return fields.length ? fields : [""];
}

const defaultClassCategoryOptions = ["Все классы", "1-4 классы", "5-8 классы", "9-11 классы"];

function splitParticipantGroups(value: string | undefined) {
  return (value || "")
    .split(/[,;|/\\\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

function sortClassNames(values: string[]) {
  return uniqueValues(values).sort((first, second) => {
    const firstNumber = Number(first.match(/\d{1,2}/)?.[0] ?? 0);
    const secondNumber = Number(second.match(/\d{1,2}/)?.[0] ?? 0);
    if (firstNumber !== secondNumber) return firstNumber - secondNumber;
    return first.localeCompare(second, "ru", { numeric: true });
  });
}

function splitLines(value: string) {
  return value
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePageBlocks(value: string | undefined, description: string): PageContentBlock[] {
  try {
    const parsed = JSON.parse(value || "[]") as PageContentBlock[];
    if (Array.isArray(parsed) && parsed.length) {
      return parsed.map((block) => ({
        id: block.id || `block-${crypto.randomUUID()}`,
        kind: block.kind || "custom",
        title: block.title || "Новый блок",
        text: block.text || "",
        items: Array.isArray(block.items) ? block.items : [],
        enabled: block.enabled !== false
      }));
    }
  } catch {
    // Старые черновики без структуры блоков получают стандартные секции.
  }

  return defaultPageBlocks.map((block) => ({
    ...block,
    text: block.id === "position" && description ? description : block.text
  }));
}

function imageFileToSquareDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      try {
        const size = 900;
        const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
        const sourceX = Math.max(0, (image.naturalWidth - sourceSize) / 2);
        const sourceY = Math.max(0, (image.naturalHeight - sourceSize) / 2);
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas is unavailable");
        context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      } catch {
        reject();
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject();
    };
    image.src = url;
  });
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
