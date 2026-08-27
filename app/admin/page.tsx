"use client";

import { Card, SectionTitle } from "@/components/card";
import { getAdminStore, patchAdminStore, type AdminStore } from "@/lib/admin-store-client";
import { getAllowedAdminSections, roles, canAccessAdmin } from "@/lib/auth";
import { defaultHomeSectionSettings, homeSections, homeSectionSettingsKey, type HomeSectionId, type HomeSectionSettings } from "@/lib/home-sections";
import { actions, applications, classes, events, news, rating } from "@/lib/mock-data";
import { newsOverridesKey, newsVisibilityKey, type NewsVisibility } from "@/lib/news-visibility";
import { hasConfiguredSheets } from "@/lib/sheets-config";
import { roleStorageKey } from "@/lib/storage";
import type { EventItem, NewsItem, UserRole } from "@/lib/types";
import { CalendarPlus, Copy, Download, Eye, EyeOff, FilePenLine, FileUp, Lock, Newspaper, Plus, Settings, ShieldCheck, Trash2, Trophy, Users } from "lucide-react";
import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

export default function AdminPage() {
  const [role, setRole] = useState<UserRole>("admin");
  const [active, setActive] = useState("Dashboard");
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [remoteEvents, setRemoteEvents] = useState<EventItem[]>(events);
  const [eventPageDrafts, setEventPageDrafts] = useState<EventPageDraft[]>([]);

  const allowedTabs = useMemo(() => getAllowedAdminSections(role), [role]);

  useEffect(() => {
    const savedRole = (localStorage.getItem(roleStorageKey) as UserRole | null) ?? "admin";
    setRole(savedRole);
    setUnlocked(localStorage.getItem("school46.admin") === "ok");
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
    migrateLocalAdminStore()
      .then(getAdminStore)
      .then((store) => setEventPageDrafts(store.eventPages as EventPageDraft[]))
      .catch(() => setEventPageDrafts([]));
  }, [active, unlocked]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (password === "school46") {
      localStorage.setItem("school46.admin", "ok");
      setUnlocked(true);
    }
  }

  if (!unlocked) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <Card className="w-full max-w-md">
          <Lock className="mb-4 text-apple" size={32} />
          <h1 className="text-2xl font-semibold">Вход в админ-панель</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Mock-auth для первого этапа. Пароль по умолчанию: school46.</p>
          <form onSubmit={submit} className="mt-6 grid gap-3">
            <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Пароль" type="password" className="focus-ring rounded-[8px] border border-line px-3 py-3" />
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
          {active === "Dashboard" ? <Dashboard events={remoteEvents} /> : null}
          {active === "Новости" ? <NewsEditor role={role} /> : null}
          {active === "Мероприятия" ? <EventsEditor title="Мероприятия" events={remoteEvents} drafts={eventPageDrafts} /> : null}
          {active === "Акции" ? <EventsEditor title="Акции" events={remoteEvents} drafts={eventPageDrafts} isAction /> : null}
          {active === "Заявки" ? <ApplicationsTable /> : null}
          {active === "Рейтинг" ? <RatingPreview /> : null}
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

function Dashboard({ events: adminEvents }: { events: EventItem[] }) {
  return (
    <div className="grid gap-6">
      <SectionTitle eyebrow="Dashboard" title="Обзор платформы" />
      <div className="grid gap-4 md:grid-cols-4">
        <Metric icon={<Newspaper />} label="Новости" value={news.length} />
        <Metric icon={<CalendarPlus />} label="Мероприятия" value={adminEvents.length} />
        <Metric icon={<FilePenLine />} label="Заявки" value={applications.length} />
        <Metric icon={<Trophy />} label="Классы" value={rating.length} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <AdminList title="Ближайшие события" items={adminEvents.map((item) => `${item.date} · ${item.title} · ${item.status}`)} />
        <AdminList title="Последние заявки" items={applications.map((item) => `${item.contest} · ${item.student} · ${item.status}`)} />
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

function EventsEditor({ title, events: adminEvents, drafts, isAction }: { title: string; events: EventItem[]; drafts: EventPageDraft[]; isAction?: boolean }) {
  const source = isAction ? adminEvents.filter((item) => item.type === "action") : adminEvents;
  const [templateVisibility, setTemplateVisibility] = useState<CalendarTemplateVisibility>({});
  const actions = source.map((item) => ({ label: "Страница", href: `/events/${item.slug}`, slug: item.slug, published: templateVisibility[item.slug] === true }));
  const visibleDrafts = isAction ? drafts.filter((item) => item.category === "Акция") : drafts;
  const [manualDrafts, setManualDrafts] = useState(visibleDrafts);

  useEffect(() => {
    getAdminStore().then((store) => setTemplateVisibility(store.calendarTemplateVisibility)).catch(() => setTemplateVisibility({}));
  }, []);

  useEffect(() => {
    setManualDrafts(visibleDrafts);
  }, [visibleDrafts]);

  function updateManualDrafts(nextDrafts: EventPageDraft[]) {
    patchAdminStore({ eventPages: nextDrafts }).catch(() => null);
    setManualDrafts(isAction ? nextDrafts.filter((item) => item.category === "Акция") : nextDrafts);
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
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-5">
          {manualDrafts.length ? (
            <EventPageManager
              title="Созданные вручную"
              description="Эти страницы созданы в конструкторе и не привязаны к Google-календарю."
              items={manualDrafts.map((item) => `${item.startDate || "Без даты"} · ${item.title || "Без названия"} · ${item.status}`)}
              actions={manualDrafts.map((item) => ({ label: "Редактировать", href: `/admin/events/new?edit=${encodeURIComponent(item.slug)}`, publicHref: `/events/manual/${encodeURIComponent(item.slug)}`, slug: item.slug, adminOnly: true, published: item.published !== false }))}
              onToggle={toggleManualPage}
              onDelete={deleteManualPage}
            />
          ) : null}
          <EventPageManager
            title="Шаблоны из календаря"
            description="Эти строки можно показывать в «Афише подробностей». Новые события из календаря изначально скрыты, пока админ не включит их вручную."
            items={source.map((item) => `${item.date} · ${item.title} · ${item.status}`)}
            actions={actions}
            onToggle={toggleCalendarTemplate}
          />
        </div>
        <AdminList title="События календаря" items={source.map((item) => `${item.date} · ${item.title} · ${item.status}`)} actions={actions} />
      </div>
    </div>
  );
}

function ApplicationsTable() {
  const [eventFilter, setEventFilter] = useState("Все");
  const [typeFilter, setTypeFilter] = useState("Все");
  const [classFilter, setClassFilter] = useState("Все");
  const [statusFilter, setStatusFilter] = useState("Все");
  const filtered = applications.filter((item) =>
    (eventFilter === "Все" || item.eventTitle === eventFilter) &&
    (typeFilter === "Все" || item.eventType === typeFilter) &&
    (classFilter === "Все" || item.className === classFilter) &&
    (statusFilter === "Все" || item.status === statusFilter)
  );

  return (
    <div className="grid gap-4">
      <SectionTitle eyebrow="Администрирование" title="Заявки" />
      <div className="grid gap-3 rounded-[8px] bg-mist p-4 md:grid-cols-4">
        <select value={eventFilter} onChange={(event) => setEventFilter(event.target.value)} className="rounded-[8px] border border-line bg-white px-3 py-2">
          {["Все", ...Array.from(new Set(applications.map((item) => item.eventTitle)))].map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="rounded-[8px] border border-line bg-white px-3 py-2">
          {["Все", "event", "contest", "action"].map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} className="rounded-[8px] border border-line bg-white px-3 py-2">
          {["Все", ...classes].map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-[8px] border border-line bg-white px-3 py-2">
          {["Все", "new", "accepted", "revision", "rejected", "sent"].map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      <AdminList title="Все заявки" items={filtered.map((item) => `${item.eventTitle} · ${item.student} · ${item.className} · ${item.status}`)} />
      <div className="flex flex-wrap gap-2 rounded-[8px] bg-mist p-4">
        <button onClick={() => downloadApplications(filtered)} className="flex items-center gap-2 rounded-[8px] bg-ink px-4 py-3 text-sm font-semibold text-white">
          <Download size={17} />
          Скачать заявки CSV
        </button>
        <button className="flex items-center gap-2 rounded-[8px] bg-white px-4 py-3 text-sm font-semibold text-ink">
          <FileUp size={17} />
          Экспорт в Google документ
        </button>
      </div>
    </div>
  );
}

function RatingPreview() {
  return <AdminList title="Рейтинг классов" items={rating.map((item) => `${item.place}. ${item.className} · ${item.points} баллов · ${item.comment}`)} />;
}

function SchedulePreview() {
  return <AdminList title="Расписание" items={["Расписание уроков читается из листа Google Sheets", "Расписание педагогов доступно отдельным листом", "Расписание звонков выводится публично"]} />;
}

function SettingsPanel() {
  const googleStatus = hasConfiguredSheets()
    ? "Google Таблицы подключены"
    : "Google Таблицы не подключены — используется демо-режим";
  const [homeSettings, setHomeSettings] = useState(defaultHomeSectionSettings);

  useEffect(() => {
    getAdminStore()
      .then((store) => setHomeSettings({ ...defaultHomeSectionSettings(), ...store.homeSections } as Record<HomeSectionId, boolean>))
      .catch(() => setHomeSettings(defaultHomeSectionSettings()));
  }, []);

  function toggleHomeSection(id: HomeSectionId) {
    setHomeSettings((current) => {
      const next = { ...current, [id]: current[id] === false };
      patchAdminStore({ homeSections: next }).catch(() => null);
      window.dispatchEvent(new CustomEvent("school46.home-sections-updated"));
      return next;
    });
  }

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
      </div>
      <AdminList title="Системные настройки" items={[googleStatus, "ID таблиц и названия листов вынесены в lib/sheets-config.ts", "Пароль админки можно заменить переменной окружения", "Mock-режим остается активным без ключей Google"]} icon={<Settings />} />
    </div>
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
  onDelete
}: {
  title?: string;
  description?: string;
  items: string[];
  actions: Array<{ label: string; href: string; publicHref?: string; slug?: string; adminOnly?: boolean; published?: boolean }>;
  onToggle?: (slug: string) => void;
  onDelete?: (slug: string) => void;
}) {
  return (
    <div className="rounded-[8px] border border-line bg-white p-4">
      <h3 className="mb-3 flex items-center gap-2 font-semibold text-ink"><FilePenLine size={18} /> {title}</h3>
      <p className="mb-4 text-sm leading-6 text-slate-500">{description}</p>
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
        {items.map((item, index) => (
          <div key={item} className="flex items-center justify-between gap-3 rounded-[8px] border border-line bg-white px-4 py-3 text-sm">
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

function downloadApplications(items: typeof applications) {
  const header = ["Мероприятие", "Участник", "Класс", "Руководитель", "Контакт", "Статус"];
  const rows = items.map((item) => [item.eventTitle, item.student, item.className, item.mentor, item.contact, item.status]);
  const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "applications.csv";
  link.click();
  URL.revokeObjectURL(url);
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
