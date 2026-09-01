"use client";

import { Card, SectionTitle } from "@/components/card";
import { getAdminStore, patchAdminStore, type AdminStore } from "@/lib/admin-store-client";
import { getAllowedAdminSections, roles, canAccessAdmin } from "@/lib/auth";
import { defaultHomeSectionSettings, homeSections, homeSectionSettingsKey, type HomeSectionId, type HomeSectionSettings } from "@/lib/home-sections";
import { actions, classes, events, news } from "@/lib/mock-data";
import { newsOverridesKey, newsVisibilityKey, type NewsVisibility } from "@/lib/news-visibility";
import { hasConfiguredSheets } from "@/lib/sheets-config";
import { roleStorageKey } from "@/lib/storage";
import type { ApplicationItem, EventItem, NewsItem, UserRole } from "@/lib/types";
import { CalendarPlus, Check, Copy, Download, Eye, EyeOff, FilePenLine, Lock, Newspaper, Plus, Settings, ShieldCheck, Trash2, Users } from "lucide-react";
import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

export default function AdminPage() {
  const [role, setRole] = useState<UserRole>("admin");
  const [active, setActive] = useState("Dashboard");
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [remoteEvents, setRemoteEvents] = useState<EventItem[]>(events);
  const [eventPageDrafts, setEventPageDrafts] = useState<EventPageDraft[]>([]);
  const [adminApplications, setAdminApplications] = useState<ApplicationItem[]>([]);

  const allowedTabs = useMemo(() => getAllowedAdminSections(role), [role]);

  useEffect(() => {
    const savedRole = (localStorage.getItem(roleStorageKey) as UserRole | null) ?? "admin";
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab === "events") setActive("Мероприятия");
    setRole(savedRole);
    fetch("/api/admin-auth", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { authenticated?: boolean }) => setUnlocked(Boolean(data.authenticated)))
      .catch(() => setUnlocked(false));
  }, []);

  useEffect(() => {
    localStorage.setItem(roleStorageKey, role);
    const allowed = getAllowedAdminSections(role);
    if (!allowed.includes(active)) setActive(allowed[0] ?? "Dashboard");
  }, [active, role]);

  useEffect(() => {
    if (!unlocked) return;
    fetch("/api/events", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: EventItem[]) => setRemoteEvents(data.length ? data : events))
      .catch(() => setRemoteEvents(events));
  }, [unlocked]);

  useEffect(() => {
    if (!unlocked) return;
    fetchApplications().then(setAdminApplications).catch(() => setAdminApplications([]));
  }, [unlocked]);

  useEffect(() => {
    if (!unlocked) return;
    migrateLocalAdminStore()
      .then(getAdminStore)
      .then((store) => setEventPageDrafts(store.eventPages as EventPageDraft[]))
      .catch(() => setEventPageDrafts([]));
  }, [active, unlocked]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoginError("");
    const response = await fetch("/api/admin-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });
    if (response.ok) {
      localStorage.setItem("school46.admin", "ok");
      setUnlocked(true);
      setPassword("");
    } else {
      setLoginError("Неверный пароль.");
    }
  }

  if (!unlocked) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <Card className="w-full max-w-md">
          <Lock className="mb-4 text-apple" size={32} />
          <h1 className="text-2xl font-semibold">Вход в админ-панель</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Введите пароль администратора, чтобы открыть управление сайтом.</p>
          <form onSubmit={submit} className="mt-6 grid gap-3">
            <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Пароль" type="password" className="focus-ring rounded-[8px] border border-line px-3 py-3" />
            {loginError ? <p className="rounded-[8px] bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{loginError}</p> : null}
            <button className="focus-ring rounded-[8px] bg-ink px-4 py-3 font-semibold text-white">Войти</button>
            <Link href="/" className="text-center text-sm font-semibold text-apple">На главную</Link>
          </form>
        </Card>
      </main>
    );
  }

  if (!canAccessAdmin(role)) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <Card className="max-w-lg bg-white text-center">
          <Lock className="mx-auto mb-4 text-coral" size={34} />
          <h1 className="text-2xl font-semibold">У роли viewer нет доступа в админку</h1>
          <p className="mt-2 text-sm text-slate-600">Переключите роль для демонстрации прав доступа.</p>
          <RoleSwitcher role={role} setRole={setRole} />
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-mist">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-apple">Школа №46</p>
            <h1 className="text-3xl font-semibold text-ink">Панель управления</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <RoleSwitcher role={role} setRole={setRole} />
            <Link href="/" className="rounded-[8px] bg-white px-4 py-2 text-sm font-semibold text-ink shadow-sm">Открыть сайт</Link>
          </div>
        </header>

        <div className="mb-6 flex gap-2 overflow-x-auto rounded-[8px] bg-white p-2">
          {allowedTabs.map((tab) => (
            <button key={tab} onClick={() => setActive(tab)} className={`rounded-[8px] px-4 py-2 text-sm font-semibold transition ${active === tab ? "bg-ink text-white" : "text-slate-600 hover:bg-mist"}`}>
              {tab}
            </button>
          ))}
        </div>

        <Card className="bg-white">
          {active === "Dashboard" ? <Dashboard events={remoteEvents} applications={adminApplications} /> : null}
          {active === "Новости" ? <NewsEditor role={role} /> : null}
          {active === "Мероприятия" ? <EventsEditor title="Мероприятия" events={remoteEvents} drafts={eventPageDrafts} /> : null}
          {active === "Заявки" ? <ApplicationsTable applications={adminApplications} setApplications={setAdminApplications} /> : null}
          {active === "Расписание" ? <SchedulePreview /> : null}
          {active === "Настройки" ? <SettingsPanel /> : null}
          {active === "Пользователи и роли" ? <RolesPanel /> : null}
        </Card>
      </div>
    </main>
  );
}

function RoleSwitcher({ role, setRole }: { role: UserRole; setRole: (role: UserRole) => void }) {
  return (
    <select value={role} onChange={(event) => setRole(event.target.value as UserRole)} className="focus-ring rounded-[8px] border border-line bg-white px-3 py-2 text-sm font-semibold text-ink">
      {roles.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
    </select>
  );
}

function Dashboard({ events: adminEvents, applications: adminApplications }: { events: EventItem[]; applications: ApplicationItem[] }) {
  return (
    <div className="grid gap-6">
      <SectionTitle eyebrow="Dashboard" title="Обзор платформы" />
      <div className="grid gap-4 md:grid-cols-3">
        <Metric icon={<Newspaper />} label="Новости" value={news.length} />
        <Metric icon={<CalendarPlus />} label="Мероприятия" value={adminEvents.length} />
        <Metric icon={<FilePenLine />} label="Заявки" value={adminApplications.length} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <AdminList title="Ближайшие события" items={adminEvents.map((item) => `${item.date} · ${item.title} · ${item.status}`)} />
        <AdminList title="Последние заявки" items={adminApplications.map((item) => `${item.contest} · ${item.student} · ${item.status}`)} />
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <Card className="bg-white">
      <div className="mb-4 text-apple">{icon}</div>
      <p className="text-3xl font-semibold text-ink">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </Card>
  );
}

function NewsEditor({ role }: { role: UserRole }) {
  const visibleNews = role === "class_teacher" ? news.filter((item) => item.className === "8А" || item.className === "Все") : news;
  const [visibility, setVisibility] = useState<NewsVisibility>({});

  useEffect(() => {
    getAdminStore().then((store) => setVisibility(store.newsVisibility)).catch(() => setVisibility({}));
  }, []);

  function toggleNews(slug: string) {
    setVisibility((current) => {
      const next = { ...current, [slug]: current[slug] === false };
      patchAdminStore({ newsVisibility: next }).catch(() => null);
      window.dispatchEvent(new CustomEvent("school46.news-visibility-updated"));
      return next;
    });
  }

  async function copyNews(item: NewsItem) {
    const store = await getAdminStore();
    const nextItem = {
      ...item,
      id: `copy-${Date.now()}`,
      slug: `${item.slug}-copy-${Date.now()}`,
      title: `Копия: ${item.title}`,
      status: "draft" as const
    };
    await patchAdminStore({ newsOverrides: { ...store.newsOverrides, [nextItem.slug]: nextItem } });
    window.alert("Копия новости сохранена как черновик в проекте.");
  }

  return (
    <div>
      <SectionTitle
        eyebrow="Редактирование"
        title="Новости"
        action={
          <button type="button" className="focus-ring flex items-center gap-2 rounded-[8px] bg-ink px-4 py-3 text-sm font-semibold text-white">
            <Plus size={17} />
            Создать новость
          </button>
        }
      />
      <p className="mb-4 rounded-[8px] bg-mist px-4 py-3 text-sm leading-6 text-slate-600">
        Управляйте отображением новостей на главной странице и в ленте. Скрытая новость остаётся в админке, но не показывается посетителям.
      </p>
      <div className="rounded-[8px] border border-line bg-white p-4">
        <h3 className="mb-3 flex items-center gap-2 font-semibold text-ink"><Newspaper size={18} /> Лента новостей</h3>
        <div className="grid gap-2">
          {visibleNews.map((item) => {
            const published = item.status === "published" && visibility[item.slug] !== false;
            return (
              <div key={item.slug} className="rounded-[8px] border border-line bg-mist p-3">
                <p className="text-sm font-semibold text-ink">{item.date} · {item.title} · {item.status}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/news/${item.slug}`} className="rounded-[8px] bg-ink px-3 py-2 text-sm font-semibold text-white">Открыть</Link>
                  <Link href={`/admin/news/${item.slug}`} className="flex items-center gap-2 rounded-[8px] bg-white px-3 py-2 text-sm font-semibold text-slate-600">
                    <FilePenLine size={15} />
                    Редактировать
                  </Link>
                  <button type="button" onClick={() => copyNews(item)} className="flex items-center gap-2 rounded-[8px] bg-white px-3 py-2 text-sm font-semibold text-slate-600">
                    <Copy size={15} />
                    Создать копию
                  </button>
                  <button type="button" onClick={() => toggleNews(item.slug)} className="flex items-center gap-2 rounded-[8px] bg-white px-3 py-2 text-sm font-semibold text-slate-600">
                    {published ? <EyeOff size={15} /> : <Eye size={15} />}
                    {published ? "Скрыть с сайта" : "Показать на сайте"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type EventPageDraft = {
  title: string;
  category: string;
  startDate: string;
  status: string;
  slug: string;
  published?: boolean;
  autoHideDate?: string;
};

type CalendarTemplateVisibility = Record<string, boolean>;

function eventDraftMonthLabel(date: string | undefined) {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return "Без даты";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "Без даты";
  return new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(parsed);
}

function uniqueFilterValues(values: string[]) {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

function EventsEditor({ title, events: adminEvents, drafts }: { title: string; events: EventItem[]; drafts: EventPageDraft[] }) {
  const source = adminEvents;
  const [templateVisibility, setTemplateVisibility] = useState<CalendarTemplateVisibility>({});
  const actions = source.map((item) => ({ label: "Страница", href: `/events/${item.slug}`, slug: item.slug, published: templateVisibility[item.slug] === true }));
  const visibleDrafts = drafts;
  const [manualDrafts, setManualDrafts] = useState(visibleDrafts);
  const [manualMonthFilter, setManualMonthFilter] = useState("Все месяцы");
  const [manualCategoryFilter, setManualCategoryFilter] = useState("Все типы");
  const manualMonthOptions = useMemo(() => ["Все месяцы", ...uniqueFilterValues(manualDrafts.map((item) => eventDraftMonthLabel(item.startDate)))], [manualDrafts]);
  const manualCategoryOptions = useMemo(() => ["Все типы", ...uniqueFilterValues(manualDrafts.map((item) => item.category || "Мероприятие"))], [manualDrafts]);
  const filteredManualDrafts = useMemo(
    () => manualDrafts.filter((item) => {
      const byMonth = manualMonthFilter === "Все месяцы" || eventDraftMonthLabel(item.startDate) === manualMonthFilter;
      const byCategory = manualCategoryFilter === "Все типы" || (item.category || "Мероприятие") === manualCategoryFilter;
      return byMonth && byCategory;
    }),
    [manualCategoryFilter, manualDrafts, manualMonthFilter]
  );

  useEffect(() => {
    getAdminStore().then((store) => setTemplateVisibility(store.calendarTemplateVisibility)).catch(() => setTemplateVisibility({}));
  }, []);

  useEffect(() => {
    setManualDrafts(visibleDrafts);
  }, [visibleDrafts]);

  function updateManualDrafts(nextDrafts: EventPageDraft[]) {
    patchAdminStore({ eventPages: nextDrafts }).catch(() => null);
    setManualDrafts(nextDrafts);
  }

  async function toggleManualPage(slug: string) {
    const allDrafts = (await getAdminStore()).eventPages as EventPageDraft[];
    updateManualDrafts(allDrafts.map((item) => item.slug === slug ? { ...item, published: item.published === false } : item));
  }

  async function deleteManualPage(slug: string) {
    const confirmed = window.confirm("Удалить страницу мероприятия? Вернуть её будет уже невозможно.");
    if (!confirmed) return;
    updateManualDrafts(((await getAdminStore()).eventPages as EventPageDraft[]).filter((item) => item.slug !== slug));
  }

  function toggleCalendarTemplate(slug: string) {
    setTemplateVisibility((current) => {
      const next = { ...current, [slug]: current[slug] !== true };
      patchAdminStore({ calendarTemplateVisibility: next }).catch(() => null);
      window.dispatchEvent(new CustomEvent("school46.calendar-templates-updated"));
      return next;
    });
  }

  return (
    <div>
      <SectionTitle
        eyebrow="Редактирование"
        title={title}
        action={
          <Link href="/admin/events/new" className="focus-ring flex items-center gap-2 rounded-[8px] bg-ink px-4 py-3 text-sm font-semibold text-white">
            <Plus size={17} />
            Создать событие
          </Link>
        }
      />
      <p className="mb-4 rounded-[8px] bg-mist px-4 py-3 text-sm leading-6 text-slate-600">
        Календарь ниже показывает события из Google-таблицы. Страницы мероприятий создаются отдельно с нуля и не зависят от календарной строки.
      </p>
      <div className="grid gap-5">
        <div className="grid gap-5">
          {manualDrafts.length ? (
            <div className="rounded-[8px] border border-line bg-white p-4">
              <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px_220px] md:items-end">
                <div>
                  <h3 className="flex items-center gap-2 font-semibold text-ink"><FilePenLine size={18} /> Созданные вручную</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Эти страницы созданы в конструкторе и не привязаны к Google-календарю.</p>
                </div>
                <select value={manualMonthFilter} onChange={(event) => setManualMonthFilter(event.target.value)} className="focus-ring rounded-[8px] border border-line bg-white px-3 py-2 text-sm font-semibold text-ink">
                  {manualMonthOptions.map((item) => <option key={item}>{item}</option>)}
                </select>
                <select value={manualCategoryFilter} onChange={(event) => setManualCategoryFilter(event.target.value)} className="focus-ring rounded-[8px] border border-line bg-white px-3 py-2 text-sm font-semibold text-ink">
                  {manualCategoryOptions.map((item) => <option key={item}>{item}</option>)}
                </select>
              </div>
              <EventPageManager
                compact
                items={filteredManualDrafts.map((item) => `${item.startDate || "Без даты"} · ${item.title || "Без названия"} · ${item.status}`)}
                actions={filteredManualDrafts.map((item) => ({ label: "Редактировать", href: `/admin/events/new?edit=${encodeURIComponent(item.slug)}`, publicHref: `/events/manual/${encodeURIComponent(item.slug)}`, slug: item.slug, adminOnly: true, published: item.published !== false }))}
                onToggle={toggleManualPage}
                onDelete={deleteManualPage}
              />
              {!filteredManualDrafts.length ? <p className="rounded-[8px] bg-mist px-4 py-3 text-sm text-slate-500">По выбранным фильтрам страниц нет.</p> : null}
            </div>
          ) : null}
          <EventPageManager
            title="Шаблоны из календаря"
            description="Эти строки можно показывать в «Афише подробностей». Новые события из календаря изначально скрыты, пока админ не включит их вручную."
            items={source.map((item) => `${item.date} · ${item.title} · ${item.status}`)}
            actions={actions}
            onToggle={toggleCalendarTemplate}
          />
        </div>
      </div>
    </div>
  );
}

function ApplicationsTable({ applications, setApplications }: { applications: ApplicationItem[]; setApplications: (items: ApplicationItem[]) => void }) {
  const [selectedEvent, setSelectedEvent] = useState("");
  const [typeFilter, setTypeFilter] = useState("Все");
  const [classFilter, setClassFilter] = useState("Все");
  const [statusFilter, setStatusFilter] = useState("Все");
  const [activeApplication, setActiveApplication] = useState<ApplicationItem | null>(null);
  const [editingApplication, setEditingApplication] = useState<ApplicationItem | null>(null);
  const [message, setMessage] = useState("");
  const eventGroups = useMemo(() => groupApplicationsByEvent(applications), [applications]);
  const selectedApplications = selectedEvent ? applications.filter((item) => item.eventTitle === selectedEvent) : [];
  const filtered = selectedApplications.filter((item) =>
    (typeFilter === "Все" || item.eventType === typeFilter) &&
    (classFilter === "Все" || item.className === classFilter) &&
    (statusFilter === "Все" || item.status === statusFilter)
  );
  const classOptions = useMemo(() => ["Все", ...uniqueFilterValues(selectedApplications.map((item) => item.className))], [selectedApplications]);
  const typeOptions = useMemo(() => ["Все", ...uniqueFilterValues(selectedApplications.map((item) => item.eventType))], [selectedApplications]);

  async function refresh() {
    const nextApplications = await fetchApplications();
    setApplications(nextApplications);
    setMessage("Список заявок обновлён.");
  }

  async function removeApplication(id: string) {
    if (!window.confirm("Удалить заявку?")) return;
    const nextApplications = await deleteApplication(id);
    setApplications(nextApplications);
    setActiveApplication(null);
    setEditingApplication(null);
    setMessage("Заявка удалена.");
  }

  async function saveApplication(application: ApplicationItem) {
    const nextApplications = await updateApplication(application);
    setApplications(nextApplications);
    setEditingApplication(null);
    setActiveApplication(null);
    setMessage("Заявка обновлена.");
  }

  function openEvent(title: string) {
    setSelectedEvent(title);
    setTypeFilter("Все");
    setClassFilter("Все");
    setStatusFilter("Все");
    setMessage("");
  }

  return (
    <div className="grid gap-4">
      <SectionTitle eyebrow="Администрирование" title="Заявки" />
      {message ? <p className="rounded-[8px] bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
      {!selectedEvent ? (
        <>
          <div className="flex flex-wrap gap-2 rounded-[8px] bg-mist p-4">
            <button type="button" onClick={refresh} className="flex items-center gap-2 rounded-[8px] bg-white px-4 py-3 text-sm font-semibold text-ink">
              <Check size={17} />
              Обновить список
            </button>
            <button type="button" onClick={() => downloadApplicationsExcel(applications)} disabled={!applications.length} className="flex items-center gap-2 rounded-[8px] bg-ink px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">
              <Download size={17} />
              Скачать все заявки Excel
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {!eventGroups.length ? <p className="rounded-[8px] bg-mist px-4 py-3 text-sm text-slate-500">Пока нет заявок.</p> : null}
            {eventGroups.map((group) => (
              <button key={group.title} type="button" onClick={() => openEvent(group.title)} className="focus-ring rounded-[8px] border border-line bg-white p-4 text-left shadow-sm transition hover:border-apple hover:bg-sky-50">
                <span className="block text-sm font-semibold text-slate-500">{eventTypeLabel(group.type)}</span>
                <span className="mt-1 block text-lg font-semibold text-ink">{group.title}</span>
                <span className="mt-3 inline-flex rounded-[8px] bg-mist px-3 py-2 text-sm font-semibold text-slate-700">{group.count} {applicationCountLabel(group.count)}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] bg-mist p-4">
            <div>
              <button type="button" onClick={() => setSelectedEvent("")} className="mb-2 text-sm font-semibold text-apple">Назад к мероприятиям</button>
              <h3 className="text-xl font-semibold text-ink">{selectedEvent}</h3>
              <p className="text-sm text-slate-500">{selectedApplications.length} {applicationCountLabel(selectedApplications.length)}</p>
            </div>
            <button type="button" onClick={() => downloadApplicationsExcel(filtered)} disabled={!filtered.length} className="flex items-center gap-2 rounded-[8px] bg-ink px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">
              <Download size={17} />
              Скачать Excel
            </button>
          </div>
          <div className="grid gap-3 rounded-[8px] bg-mist p-4 md:grid-cols-3">
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="rounded-[8px] border border-line bg-white px-3 py-2">
              {typeOptions.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} className="rounded-[8px] border border-line bg-white px-3 py-2">
              {classOptions.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-[8px] border border-line bg-white px-3 py-2">
              {["Все", "new", "accepted", "revision", "rejected", "sent"].map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <div className="grid gap-2">
            {!filtered.length ? <p className="rounded-[8px] bg-mist px-4 py-3 text-sm text-slate-500">По этим фильтрам заявок нет.</p> : null}
            {filtered.map((item) => (
              <div key={item.id} className="rounded-[8px] border border-line bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{item.student || "Без имени"} · {item.className || "Класс не указан"}</p>
                    <p className="mt-1 text-sm text-slate-500">{formatDateTime(item.createdAt)} · {statusLabel(item.status)}</p>
                    {item.files?.length ? <p className="mt-1 text-sm font-semibold text-apple">Вложения: {item.files.length}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setActiveApplication(item)} className="rounded-[8px] bg-ink px-3 py-2 text-sm font-semibold text-white">Открыть</button>
                    <button type="button" onClick={() => setEditingApplication(item)} className="flex items-center gap-2 rounded-[8px] bg-mist px-3 py-2 text-sm font-semibold text-slate-600">
                      <FilePenLine size={15} />
                      Изменить
                    </button>
                    <button type="button" onClick={() => removeApplication(item.id)} className="flex items-center gap-2 rounded-[8px] bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                      <Trash2 size={15} />
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {activeApplication ? <ApplicationDetailsModal application={activeApplication} onClose={() => setActiveApplication(null)} /> : null}
      {editingApplication ? <ApplicationEditModal application={editingApplication} onClose={() => setEditingApplication(null)} onSave={saveApplication} /> : null}
    </div>
  );
}

function ApplicationDetailsModal({ application, onClose }: { application: ApplicationItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[8px] bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-apple">{application.eventTitle}</p>
            <h3 className="text-2xl font-semibold text-ink">{application.student || "Заявка"}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-[8px] bg-mist px-3 py-2 text-sm font-semibold text-slate-600">Закрыть</button>
        </div>
        <ApplicationInfoGrid application={application} />
        <ApplicationFiles files={application.files ?? []} />
      </div>
    </div>
  );
}

function ApplicationEditModal({
  application,
  onClose,
  onSave
}: {
  application: ApplicationItem;
  onClose: () => void;
  onSave: (application: ApplicationItem) => void;
}) {
  const [draft, setDraft] = useState(application);

  function updateField(field: keyof ApplicationItem, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave(draft);
        }}
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[8px] bg-white p-5 shadow-soft"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-apple">{draft.eventTitle}</p>
            <h3 className="text-2xl font-semibold text-ink">Изменить заявку</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-[8px] bg-mist px-3 py-2 text-sm font-semibold text-slate-600">Отмена</button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <ApplicationInput label="Участник" value={draft.student} onChange={(value) => updateField("student", value)} />
          <ApplicationInput label="Класс" value={draft.className} onChange={(value) => updateField("className", value)} />
          <ApplicationInput label="Педагог" value={draft.mentor} onChange={(value) => updateField("mentor", value)} />
          <ApplicationInput label="Номинация" value={draft.nomination} onChange={(value) => updateField("nomination", value)} />
          <ApplicationInput label="Контакт" value={draft.contact} onChange={(value) => updateField("contact", value)} />
          <ApplicationInput label="Ссылка на работу" value={draft.workUrl} onChange={(value) => updateField("workUrl", value)} />
          <label className="grid gap-2 text-sm font-medium text-slate-600">
            Статус
            <select value={draft.status} onChange={(event) => updateField("status", event.target.value)} className="focus-ring rounded-[8px] border border-line bg-white px-3 py-2">
              {["new", "accepted", "revision", "rejected", "sent"].map((status) => <option key={status} value={status}>{statusLabel(status as ApplicationItem["status"])}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-600 md:col-span-2">
            Комментарий
            <textarea value={draft.comment} onChange={(event) => updateField("comment", event.target.value)} rows={4} className="focus-ring rounded-[8px] border border-line bg-white px-3 py-2" />
          </label>
        </div>
        <ApplicationFiles files={draft.files ?? []} />
        <button className="mt-4 rounded-[8px] bg-ink px-4 py-3 text-sm font-semibold text-white">Сохранить заявку</button>
      </form>
    </div>
  );
}

function ApplicationInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-600">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className="focus-ring rounded-[8px] border border-line bg-white px-3 py-2" />
    </label>
  );
}

function ApplicationInfoGrid({ application }: { application: ApplicationItem }) {
  const rows = [
    ["Дата", formatDateTime(application.createdAt)],
    ["Тип", eventTypeLabel(application.eventType)],
    ["Статус", statusLabel(application.status)],
    ["Класс", application.className],
    ["Педагог", application.mentor],
    ["Номинация", application.nomination],
    ["Контакт", application.contact],
    ["Ссылка на работу", application.workUrl],
    ["Комментарий", application.comment]
  ];

  return (
    <div className="grid gap-2 md:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-[8px] border border-line bg-mist p-3">
          <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
          {label === "Ссылка на работу" && value ? (
            <a href={value} target="_blank" rel="noreferrer" className="mt-1 block break-words font-semibold text-apple">{value}</a>
          ) : (
            <p className="mt-1 break-words font-semibold text-ink">{value || "Не указано"}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function ApplicationFiles({ files }: { files: NonNullable<ApplicationItem["files"]> }) {
  if (!files.length) return null;
  return (
    <div className="mt-4 rounded-[8px] border border-line bg-white p-4">
      <h4 className="mb-3 font-semibold text-ink">Вложения</h4>
      <div className="grid gap-3 sm:grid-cols-2">
        {files.map((file) => (
          <div key={`${file.name}-${file.size}`} className="rounded-[8px] border border-line bg-mist p-3">
            <p className="break-words text-sm font-semibold text-ink">{file.name}</p>
            <p className="mt-1 text-xs text-slate-500">{file.type || "файл"} · {formatFileSize(file.size)}</p>
            {file.dataUrl ? (
              <a href={file.dataUrl} target="_blank" rel="noreferrer" className="mt-3 block overflow-hidden rounded-[8px] border border-line bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={file.dataUrl} alt={file.name} className="max-h-64 w-full object-contain" />
              </a>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function SchedulePreview() {
  return <AdminList title="Расписание" items={["Расписание уроков читается из листа Google Sheets", "Расписание педагогов доступно отдельным листом", "Расписание звонков выводится публично"]} />;
}

function SettingsPanel() {
  const googleStatus = hasConfiguredSheets()
    ? "Google Таблицы подключены"
    : "Google Таблицы не подключены — используется демо-режим";
  const [homeSettings, setHomeSettings] = useState(defaultHomeSectionSettings);
  const [savedHomeSettings, setSavedHomeSettings] = useState(defaultHomeSectionSettings);
  const [homeSettingsMessage, setHomeSettingsMessage] = useState("");

  useEffect(() => {
    getAdminStore()
      .then((store) => {
        const next = { ...defaultHomeSectionSettings(), ...store.homeSections } as Record<HomeSectionId, boolean>;
        setHomeSettings(next);
        setSavedHomeSettings(next);
      })
      .catch(() => {
        const defaults = defaultHomeSectionSettings();
        setHomeSettings(defaults);
        setSavedHomeSettings(defaults);
      });
  }, []);

  function toggleHomeSection(id: HomeSectionId) {
    setHomeSettingsMessage("");
    setHomeSettings((current) => {
      const next = { ...current, [id]: current[id] === false };
      return next;
    });
  }

  async function saveHomeSections() {
    await patchAdminStore({ homeSections: homeSettings });
    setSavedHomeSettings(homeSettings);
    setHomeSettingsMessage("Настройки блоков сохранены.");
    window.dispatchEvent(new CustomEvent("school46.home-sections-updated"));
  }

  const homeSettingsChanged = JSON.stringify(homeSettings) !== JSON.stringify(savedHomeSettings);

  return (
    <div className="grid gap-5">
      <SectionTitle eyebrow="Настройки" title="Отображение сайта" />
      <div className="rounded-[8px] border border-line bg-white p-4">
        <h3 className="mb-2 flex items-center gap-2 font-semibold text-ink"><Settings size={18} /> Блоки главной страницы</h3>
        <p className="mb-4 text-sm leading-6 text-slate-500">Включайте и выключайте секции, которые видны на главной странице сайта.</p>
        <div className="grid gap-2 md:grid-cols-2">
          {homeSections.map((section) => {
            const enabled = homeSettings[section.id] !== false;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => toggleHomeSection(section.id)}
                className={`flex items-center justify-between gap-3 rounded-[8px] border px-4 py-3 text-left transition ${enabled ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-line bg-mist text-slate-500"}`}
              >
                <span>
                  <span className="block font-semibold">{section.title}</span>
                  <span className="mt-1 block text-xs leading-5">{section.description}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2 text-sm font-semibold">
                  {enabled ? <Eye size={17} /> : <EyeOff size={17} />}
                  {enabled ? "Включен" : "Скрыт"}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={saveHomeSections}
            className="focus-ring flex items-center gap-2 rounded-[8px] bg-ink px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={!homeSettingsChanged}
          >
            <Check size={17} />
            Сохранить
          </button>
          {homeSettingsMessage ? <span className="text-sm font-semibold text-emerald-700">{homeSettingsMessage}</span> : null}
          {homeSettingsChanged ? <span className="text-sm font-semibold text-amber-700">Есть несохранённые изменения</span> : null}
        </div>
      </div>
      <PasswordSettings />
      <AdminList title="Системные настройки" items={[googleStatus, "ID таблиц и названия листов вынесены в lib/sheets-config.ts", "Mock-режим остается активным без ключей Google"]} icon={<Settings />} />
    </div>
  );
}

function PasswordSettings() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (newPassword.length < 6) {
      setError("Новый пароль должен быть не короче 6 символов.");
      return;
    }
    if (newPassword !== repeatPassword) {
      setError("Повтор пароля не совпадает.");
      return;
    }

    const response = await fetch("/api/admin-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "change-password", currentPassword, newPassword })
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({ message: "Не удалось сменить пароль." }));
      setError(data.message || "Не удалось сменить пароль.");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setRepeatPassword("");
    setMessage("Пароль обновлен.");
  }

  return (
    <form onSubmit={submit} className="rounded-[8px] border border-line bg-white p-4">
      <h3 className="mb-2 flex items-center gap-2 font-semibold text-ink"><ShieldCheck size={18} /> Пароль админки</h3>
      <p className="mb-4 text-sm leading-6 text-slate-500">Смените пароль для входа в панель управления. Новый пароль начнет действовать сразу.</p>
      <div className="grid gap-3 md:grid-cols-3">
        <input value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} type="password" placeholder="Текущий пароль" className="focus-ring rounded-[8px] border border-line bg-white px-3 py-3" />
        <input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} type="password" placeholder="Новый пароль" className="focus-ring rounded-[8px] border border-line bg-white px-3 py-3" />
        <input value={repeatPassword} onChange={(event) => setRepeatPassword(event.target.value)} type="password" placeholder="Повторите пароль" className="focus-ring rounded-[8px] border border-line bg-white px-3 py-3" />
      </div>
      {error ? <p className="mt-3 rounded-[8px] bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}
      {message ? <p className="mt-3 rounded-[8px] bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p> : null}
      <button className="focus-ring mt-4 rounded-[8px] bg-ink px-4 py-3 text-sm font-semibold text-white">Сменить пароль</button>
    </form>
  );
}

function RolesPanel() {
  return <AdminList title="Пользователи и роли" items={roles.map((item) => `${item.title} · ${item.description}`)} icon={<Users />} />;
}

function EditorLayout({ title, form, items, actions = [] }: { title: string; form: ReactNode; items: string[]; actions?: Array<{ label: string; href: string }> }) {
  return (
    <div>
      <SectionTitle eyebrow="Редактирование" title={title} />
      {actions.length ? <p className="mb-4 rounded-[8px] bg-mist px-4 py-3 text-sm leading-6 text-slate-600">Список ниже загружается из тех же данных, что и публичный календарь событий. Копирование и редактирование находятся в блоке «Конструктор страниц».</p> : null}
      <div className="grid gap-5 lg:grid-cols-[390px_1fr]">
        {form}
        <div className="grid gap-5">
          {actions.length ? <EventPageManager items={items} actions={actions} /> : null}
          <AdminList title="Записи" items={items} actions={actions} />
        </div>
      </div>
    </div>
  );
}

function EventPageManager({
  title = "Мастерская событий",
  description = "Здесь можно открыть готовую страницу, перейти к редактированию или создать копию как основу для нового мероприятия.",
  items,
  actions,
  onToggle,
  onDelete,
  compact = false
}: {
  title?: string;
  description?: string;
  items: string[];
  actions: Array<{ label: string; href: string; publicHref?: string; slug?: string; adminOnly?: boolean; published?: boolean }>;
  onToggle?: (slug: string) => void;
  onDelete?: (slug: string) => void;
  compact?: boolean;
}) {
  const content = (
    <>
      {!compact ? (
        <>
      <h3 className="mb-3 flex items-center gap-2 font-semibold text-ink"><FilePenLine size={18} /> {title}</h3>
      <p className="mb-4 text-sm leading-6 text-slate-500">{description}</p>
        </>
      ) : null}
      <div className="grid gap-2">
        {items.map((item, index) => (
          <div key={`${item}-page`} className="rounded-[8px] border border-line bg-mist p-3">
            <p className="text-sm font-semibold text-ink">{item}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {actions[index]?.adminOnly ? (
                <Link href={actions[index]?.publicHref ?? "/events"} className="rounded-[8px] bg-ink px-3 py-2 text-sm font-semibold text-white">Открыть</Link>
              ) : (
                <Link href={actions[index]?.href ?? "/events"} className="rounded-[8px] bg-ink px-3 py-2 text-sm font-semibold text-white">Открыть</Link>
              )}
              <Link href={actions[index]?.adminOnly ? actions[index].href : `/admin/events/new?edit=${encodeURIComponent(actions[index]?.slug ?? "")}`} className="flex items-center gap-2 rounded-[8px] bg-white px-3 py-2 text-sm font-semibold text-slate-600">
                <FilePenLine size={15} />
                Редактировать
              </Link>
              <Link href={`/admin/events/new?copy=${encodeURIComponent(actions[index]?.slug ?? "")}`} className="flex items-center gap-2 rounded-[8px] bg-white px-3 py-2 text-sm font-semibold text-slate-600">
                <Copy size={15} />
                Создать копию
              </Link>
              {actions[index]?.slug ? (
                <>
                  <button type="button" onClick={() => onToggle?.(actions[index].slug ?? "")} className="flex items-center gap-2 rounded-[8px] bg-white px-3 py-2 text-sm font-semibold text-slate-600">
                    {actions[index].published !== true ? <Eye size={15} /> : <EyeOff size={15} />}
                    {actions[index].published !== true ? "Показать на сайте" : "Скрыть с сайта"}
                  </button>
                  {actions[index]?.adminOnly ? (
                    <button type="button" onClick={() => onDelete?.(actions[index].slug ?? "")} className="flex items-center gap-2 rounded-[8px] bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                      <Trash2 size={15} />
                      Удалить
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </>
  );

  if (compact) return content;

  return (
    <div className="rounded-[8px] border border-line bg-white p-4">
      {content}
    </div>
  );
}

function AdminForm({ fields, selectLabel, statuses }: { fields: string[]; selectLabel: string; statuses: string[] }) {
  return (
    <form className="grid gap-3 rounded-[8px] bg-mist p-4">
      {fields.map((field) => <input key={field} placeholder={field} className="focus-ring rounded-[8px] border border-line bg-white px-3 py-2" />)}
      <select className="focus-ring rounded-[8px] border border-line bg-white px-3 py-2">
        <option>{selectLabel}</option>
        {classes.map((className) => <option key={className}>{className}</option>)}
      </select>
      <select className="focus-ring rounded-[8px] border border-line bg-white px-3 py-2">
        {statuses.map((status) => <option key={status}>{status}</option>)}
      </select>
      {statuses.includes("planned") ? (
        <div className="grid gap-3 rounded-[8px] border border-line bg-white p-3">
          <p className="font-semibold text-ink">Заявочная форма</p>
          <label className="flex items-center justify-between gap-3 text-sm text-slate-600">
            Принимать заявки
            <input type="checkbox" />
          </label>
          <input type="date" className="focus-ring rounded-[8px] border border-line bg-white px-3 py-2" />
          <input placeholder="Поля заявки: student,className,mentor,nomination,contact,workUrl" className="focus-ring rounded-[8px] border border-line bg-white px-3 py-2" />
          <input placeholder="Текст кнопки: Подать заявку" className="focus-ring rounded-[8px] border border-line bg-white px-3 py-2" />
          <label className="flex items-center justify-between gap-3 text-sm text-slate-600">
            Разрешить прикреплять файлы
            <input type="checkbox" defaultChecked />
          </label>
          <input placeholder="Допустимые файлы: pdf, docx, jpg, png, zip" className="focus-ring rounded-[8px] border border-line bg-white px-3 py-2" />
        </div>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" className="focus-ring flex items-center justify-center gap-2 rounded-[8px] bg-white px-4 py-3 font-semibold text-ink">
          <Copy size={18} />
          Создать копию
        </button>
        <button type="button" className="focus-ring flex items-center justify-center gap-2 rounded-[8px] bg-white px-4 py-3 font-semibold text-ink">
          <Download size={18} />
          Скачать настройки
        </button>
      </div>
      <button type="button" className="focus-ring flex items-center justify-center gap-2 rounded-[8px] bg-ink px-4 py-3 font-semibold text-white">
        <ShieldCheck size={18} />
        Сохранить в таблицу
      </button>
    </form>
  );
}

function AdminList({ title, items, icon, actions = [] }: { title: string; items: string[]; icon?: ReactNode; actions?: Array<{ label: string; href: string }> }) {
  return (
    <div className="rounded-[8px] border border-line bg-white p-4">
      <h3 className="mb-3 flex items-center gap-2 font-semibold text-ink">{icon}{title}</h3>
      <div className="grid gap-2">
        {!items.length ? <p className="rounded-[8px] bg-mist px-4 py-3 text-sm text-slate-500">Пока нет записей.</p> : null}
        {items.map((item, index) => (
          <div key={`${item}-${index}`} className="flex items-center justify-between gap-3 rounded-[8px] border border-line bg-white px-4 py-3 text-sm">
            <span>{item}</span>
            <div className="flex shrink-0 gap-2">
              {actions[index] ? <Link href={actions[index].href} className="rounded-[8px] bg-mist px-3 py-2 font-semibold text-slate-600">{actions[index].label}</Link> : null}
              <button className="rounded-[8px] bg-mist px-3 py-2 font-semibold text-slate-600">Изменить</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function fetchApplications() {
  const response = await fetch("/api/applications", { cache: "no-store" });
  if (!response.ok) return [];
  const data = await response.json() as ApplicationItem[];
  return data;
}

async function updateApplication(application: ApplicationItem) {
  const response = await fetch("/api/applications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(application)
  });
  if (!response.ok) throw new Error("Не удалось обновить заявку");
  return await response.json() as ApplicationItem[];
}

async function deleteApplication(id: string) {
  const response = await fetch(`/api/applications?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Не удалось удалить заявку");
  return await response.json() as ApplicationItem[];
}

function downloadApplicationsExcel(items: ApplicationItem[]) {
  const header = ["Дата", "Мероприятие", "Тип", "Участник", "Класс", "Педагог", "Номинация", "Контакт", "Ссылка на работу", "Комментарий", "Статус", "Вложения"];
  const rows = items.map((item) => [
    formatDateTime(item.createdAt),
    item.eventTitle,
    eventTypeLabel(item.eventType),
    item.student,
    item.className,
    item.mentor,
    item.nomination,
    item.contact,
    item.workUrl,
    item.comment,
    statusLabel(item.status),
    (item.files ?? []).map((file) => file.name).join(", ")
  ]);
  const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body><table>${[header, ...rows]
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(String(cell))}</td>`).join("")}</tr>`)
    .join("")}</table></body></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "applications.xls";
  link.click();
  URL.revokeObjectURL(url);
}

function formatDateTime(value: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ru-RU");
}

function groupApplicationsByEvent(items: ApplicationItem[]) {
  const groups = new Map<string, { title: string; type: ApplicationItem["eventType"]; count: number }>();
  for (const item of items) {
    const title = item.eventTitle || item.contest || "Мероприятие";
    const current = groups.get(title);
    if (current) {
      current.count += 1;
    } else {
      groups.set(title, { title, type: item.eventType, count: 1 });
    }
  }
  return Array.from(groups.values()).sort((first, second) => first.title.localeCompare(second.title, "ru"));
}

function applicationCountLabel(count: number) {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return "заявок";
  if (last === 1) return "заявка";
  if (last >= 2 && last <= 4) return "заявки";
  return "заявок";
}

function eventTypeLabel(type: ApplicationItem["eventType"]) {
  if (type === "contest") return "Конкурс";
  if (type === "action") return "Акция";
  return "Мероприятие";
}

function statusLabel(status: ApplicationItem["status"]) {
  const labels: Record<ApplicationItem["status"], string> = {
    new: "Новая",
    accepted: "Принята",
    revision: "На доработке",
    rejected: "Отклонена",
    sent: "Отправлена"
  };
  return labels[status] ?? status;
}

function formatFileSize(size: number) {
  if (!size) return "размер не указан";
  if (size < 1024) return `${size} Б`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} КБ`;
  return `${(size / 1024 / 1024).toFixed(1)} МБ`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function migrateLocalAdminStore() {
  const store = await getAdminStore();
  const patch: Partial<AdminStore> = {};

  const localEventPages = readLocalJson<EventPageDraft[]>("school46.admin.eventPages", []);
  if (!store.eventPages.length && localEventPages.length) patch.eventPages = localEventPages;

  const localCalendarVisibility = readLocalJson<CalendarTemplateVisibility>("school46.calendarTemplateVisibility", {});
  if (!Object.keys(store.calendarTemplateVisibility).length && Object.keys(localCalendarVisibility).length) {
    patch.calendarTemplateVisibility = localCalendarVisibility;
  }

  const localNewsVisibility = readLocalJson<NewsVisibility>(newsVisibilityKey, {});
  if (!Object.keys(store.newsVisibility).length && Object.keys(localNewsVisibility).length) {
    patch.newsVisibility = localNewsVisibility;
  }

  const localNewsOverrides = readLocalJson<Record<string, NewsItem>>(newsOverridesKey, {});
  const localNewsCopies = readLocalJson<NewsItem[]>("school46.admin.newsCopies", []);
  const copiedNews = Object.fromEntries(localNewsCopies.map((item) => [item.slug, item]));
  const mergedNewsOverrides = { ...localNewsOverrides, ...copiedNews };
  if (!Object.keys(store.newsOverrides).length && Object.keys(mergedNewsOverrides).length) {
    patch.newsOverrides = mergedNewsOverrides;
  }

  const localHomeSections = readLocalJson<HomeSectionSettings>(homeSectionSettingsKey, {});
  if (!Object.keys(store.homeSections).length && Object.keys(localHomeSections).length) {
    patch.homeSections = localHomeSections;
  }

  if (Object.keys(patch).length) await patchAdminStore(patch);
}

function readLocalJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}
