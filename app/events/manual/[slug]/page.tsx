"use client";

import { ApplicationForm } from "@/components/application-form";
import { PageHero, PageShell } from "@/components/page-shell";
import { getAdminStore } from "@/lib/admin-store-client";
import type { EventItem } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { CalendarDays, CheckCircle2, ClipboardList, FileText, ImageIcon, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

type ManualEventPageDraft = {
  title?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  time?: string;
  place?: string;
  classes?: string;
  owner?: string;
  status?: string;
  slug?: string;
  cover?: string;
  description?: string;
  pageBlocks?: string;
  acceptApplications?: boolean;
  deadline?: string;
  applicationFields?: string;
  applicationButton?: string;
  published?: boolean;
  autoHideDate?: string;
};

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

export default function ManualEventPage({ params }: { params: { slug: string } }) {
  const [draft, setDraft] = useState<ManualEventPageDraft | null | undefined>(undefined);
  const slug = decodeURIComponent(params.slug);

  useEffect(() => {
    getAdminStore()
      .then((store) => setDraft(findManualDraft(store.eventPages as ManualEventPageDraft[], slug)))
      .catch(() => setDraft(null));
  }, [slug]);

  const event = useMemo(() => draft ? manualDraftToEvent(draft) : null, [draft]);
  const pageBlocks = useMemo(() => draft ? parsePageBlocks(draft.pageBlocks, draft.description || "") : [], [draft]);

  if (draft === undefined) {
    return (
      <PageShell>
        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-[8px] border border-line bg-white p-6 shadow-sm">Загружаем страницу мероприятия...</div>
        </section>
      </PageShell>
    );
  }

  if (!draft || draft.published === false || isAutoHidden(draft.autoHideDate) || !event) {
    return (
      <PageShell>
        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-[8px] border border-line bg-white p-6 shadow-sm">
            <h1 className="text-3xl font-semibold text-ink">Страница мероприятия не найдена</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">Возможно, её скрыли с сайта или удалили в админке.</p>
            <Link href="/events" className="mt-5 inline-flex rounded-[8px] bg-ink px-4 py-3 text-sm font-semibold text-white">Вернуться к событиям</Link>
          </div>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHero eyebrow={event.category} title={event.title} text={event.description || "Подробная страница мероприятия: сроки, участники, положение и заявка."} />
      <section className="mx-auto grid max-w-6xl gap-5 px-4 pb-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-8">
        <div className="grid gap-5">
          {event.cover ? (
            <div className="overflow-hidden rounded-[8px] bg-slate-100 shadow-soft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={event.cover} alt="" className="aspect-[16/9] w-full object-cover" />
            </div>
          ) : null}

          {pageBlocks.filter((block) => block.enabled).map((block) => (
            <InfoSection key={block.id} icon={blockIcon(block.kind)} title={block.title}>
              {block.text ? <p className="whitespace-pre-line">{block.text}</p> : null}
              {block.kind === "position" ? (
                <OptionalList items={[
                  draft.classes ? `Участники: ${draft.classes}` : "",
                  draft.category ? `Категория: ${draft.category}` : "",
                  draft.owner ? `Ответственный: ${draft.owner}` : ""
                ]} />
              ) : null}
              {block.items.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {block.items.map((item) => (
                    <div key={item} className="rounded-[8px] bg-mist px-3 py-2 text-sm font-semibold text-slate-600">{item}</div>
                  ))}
                </div>
              ) : null}
            </InfoSection>
          ))}

          {event.acceptApplications ? (
            <section id="application" className="pt-2">
              <h2 className="mb-4 text-2xl font-semibold text-ink">{event.applicationButtonText}</h2>
              {event.applicationDeadline ? <p className="mb-4 text-sm font-semibold text-coral">Дедлайн: {formatDate(event.applicationDeadline)}</p> : null}
              <ApplicationForm event={event} />
            </section>
          ) : (
            <div className="rounded-[8px] border border-line bg-white p-5 shadow-sm">
              <h2 className="text-2xl font-semibold text-ink">Заявочная форма</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Для этого мероприятия заявочная форма пока не включена.</p>
            </div>
          )}
        </div>

        <aside className="grid content-start gap-3">
          {draft.startDate ? <MetaCard icon={<CalendarDays />} label="Дата начала" value={formatDate(draft.startDate)} /> : null}
          {draft.endDate ? <MetaCard icon={<CalendarDays />} label="Дата окончания" value={formatDate(draft.endDate)} /> : null}
          {draft.time ? <MetaCard icon={<CalendarDays />} label="Время" value={draft.time} /> : null}
          {draft.place ? <MetaCard icon={<MapPin />} label="Место" value={draft.place} /> : null}
          {draft.classes ? <MetaCard icon={<Users />} label="Участники" value={draft.classes} /> : null}
          {draft.status ? <MetaCard icon={<FileText />} label="Статус" value={statusLabel(event.status)} /> : null}
          {draft.autoHideDate ? <MetaCard icon={<FileText />} label="Скрывается после" value={formatDate(draft.autoHideDate)} /> : null}
          <div className="flex flex-wrap gap-2 rounded-[8px] border border-line bg-white p-4 shadow-sm">
            {event.tags.map((tag) => <span key={tag} className="rounded-[8px] bg-mist px-3 py-2 text-sm font-semibold text-slate-600">{tag}</span>)}
          </div>
        </aside>
      </section>
    </PageShell>
  );
}

function findManualDraft(drafts: ManualEventPageDraft[], slug: string) {
  return Array.isArray(drafts) ? drafts.find((item) => item.slug === slug) ?? null : null;
}

function manualDraftToEvent(item: ManualEventPageDraft): EventItem {
  const date = validDateKey(item.startDate) || toDateKey(new Date());
  const category = item.category || "Мероприятие";
  const slug = item.slug || "manual-event";

  return {
    id: `manual-${slug}`,
    date,
    startDate: date,
    endDate: validDateKey(item.endDate) || undefined,
    time: item.time || "",
    title: item.title || "Новое мероприятие",
    type: eventTypeFromCategory(category),
    category,
    classCategory: item.classes || "Все классы",
    place: item.place || "",
    description: item.description || "",
    participants: item.classes || "Все классы",
    owner: item.owner || "Школа №46",
    status: normalizeStatus(item.status),
    cover: item.cover || "",
    tags: [category],
    acceptApplications: Boolean(item.acceptApplications),
    applicationDeadline: validDateKey(item.deadline) || undefined,
    applicationFields: splitFields(item.applicationFields),
    applicationButtonText: item.applicationButton || "Подать заявку",
    slug
  };
}

function MetaCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-line bg-white p-4 shadow-sm">
      <div className="mb-2 text-apple">{icon}</div>
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-ink">{value}</p>
    </div>
  );
}

function OptionalList({ items }: { items: string[] }) {
  const visible = items.filter(Boolean);
  if (!visible.length) return null;
  return (
    <ul>
      {visible.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
}

function InfoSection({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="prose prose-slate max-w-none rounded-[8px] border border-line bg-white p-5 shadow-sm prose-headings:text-ink prose-p:leading-7 prose-li:my-1">
      <h2 className="not-prose mb-3 flex items-center gap-2 text-2xl font-semibold text-ink">
        <span className="text-apple">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function blockIcon(kind: PageContentBlock["kind"]) {
  if (kind === "participation") return <CheckCircle2 />;
  if (kind === "materials") return <ImageIcon />;
  if (kind === "custom") return <FileText />;
  return <ClipboardList />;
}

function parsePageBlocks(value: string | undefined, description: string): PageContentBlock[] {
  try {
    const parsed = JSON.parse(value || "[]") as PageContentBlock[];
    if (Array.isArray(parsed) && parsed.length) {
      return parsed.map((block) => ({
        id: block.id || block.title || "block",
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

function validDateKey(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  return value;
}

function isAutoHidden(value: string | undefined) {
  const date = validDateKey(value);
  if (!date) return false;
  return date < toDateKey(new Date());
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function splitFields(value: string | undefined) {
  return (value || "ФИО участника, класс, педагог, контакт")
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function eventTypeFromCategory(category: string): EventItem["type"] {
  const normalized = category.toLowerCase();
  if (normalized.includes("конкурс") || normalized.includes("олимпиада") || normalized.includes("викторина")) return "contest";
  if (normalized.includes("акция")) return "action";
  return "event";
}

function normalizeStatus(status: string | undefined): EventItem["status"] {
  if (status === "active" || status === "finished" || status === "planned") return status;
  return "planned";
}

function statusLabel(status: EventItem["status"]) {
  if (status === "active") return "Идет";
  if (status === "finished") return "Завершено";
  return "Запланировано";
}
