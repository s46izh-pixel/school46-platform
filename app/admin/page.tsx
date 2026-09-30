"use client";

import { Card, SectionTitle } from "@/components/card";
import { getAdminStore, mutateAdminEventPage, patchAdminStore, type AdminStore } from "@/lib/admin-store-client";
import { getAllowedAdminSections, roles, canAccessAdmin } from "@/lib/auth";
import { defaultHomeSectionSettings, homeSections, homeSectionSettingsKey, type HomeSectionId, type HomeSectionSettings } from "@/lib/home-sections";
import { actions, categories, classes, events, news } from "@/lib/mock-data";
import { newsOverridesKey, newsVisibilityKey, type NewsVisibility } from "@/lib/news-visibility";
import { hasConfiguredSheets } from "@/lib/sheets-config";
import { roleStorageKey } from "@/lib/storage";
import type { ApplicationAttachment, ApplicationExportRecord, ApplicationItem, EventItem, NewsItem, UserRole } from "@/lib/types";
import { mergeNewsItems } from "@/lib/news-items";
import { defaultNewsClasses, sameNewsClass, uniqueNewsClasses } from "@/lib/news-options";
import { BookOpen, CalendarPlus, Check, Clock3, Copy, Download, ExternalLink, Eye, EyeOff, FilePenLine, FileSpreadsheet, GraduationCap, KeyRound, Lock, Newspaper, Plus, RefreshCw, Search, Settings, ShieldCheck, Tags, Trash2, Users, X } from "lucide-react";
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
  const [eventDraftsError, setEventDraftsError] = useState("");
  const [adminApplications, setAdminApplications] = useState<ApplicationItem[]>([]);

  const allowedTabs = useMemo(() => getAllowedAdminSections(role), [role]);

  useEffect(() => {
    const savedRole = (localStorage.getItem(roleStorageKey) as UserRole | null) ?? "admin";
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab === "events") setActive("Мероприятия");
    if (tab === "news") setActive("Новости");
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
    setEventDraftsError("");
    migrateLocalAdminStore()
      .then(() => getAdminStore({ requireServer: true }))
      .then((store) => setEventPageDrafts(store.eventPages as EventPageDraft[]))
      .catch((error) => {
        setEventDraftsError(error instanceof Error ? error.message : "Не удалось загрузить мероприятия.");
      });
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
          {active === "Мероприятия" ? <EventsEditor title="Мероприятия" drafts={eventPageDrafts} error={eventDraftsError} /> : null}
          {active === "Заявки" ? <ApplicationsTable applications={adminApplications} setApplications={setAdminApplications} eventDrafts={eventPageDrafts} /> : null}
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
  const [visibility, setVisibility] = useState<NewsVisibility>({});
  const [overrides, setOverrides] = useState<Record<string, NewsItem>>({});
  const [deleted, setDeleted] = useState<Record<string, boolean>>({});
  const [newsClasses, setNewsClasses] = useState(defaultNewsClasses);
  const [newsCategories, setNewsCategories] = useState(categories.map((category) => category.title));
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("Все");
  const [categoryFilter, setCategoryFilter] = useState("Все");
  const [statusFilter, setStatusFilter] = useState("Все");
  const [dictionary, setDictionary] = useState<"classes" | "categories" | null>(null);
  const [message, setMessage] = useState("");
  const allNews = useMemo(() => mergeNewsItems(news, overrides).filter((item) => deleted[item.slug] !== true), [deleted, overrides]);
  const visibleNews = useMemo(() => {
    return allNews.filter((item) => {
      const allowedForRole = role !== "class_teacher" || sameNewsClass(item.className, "8а") || item.className === "Все";
      const haystack = `${item.title} ${item.author} ${item.className} ${item.category}`.toLowerCase();
      return allowedForRole &&
        haystack.includes(query.trim().toLowerCase()) &&
        (classFilter === "Все" || sameNewsClass(item.className, classFilter)) &&
        (categoryFilter === "Все" || item.category === categoryFilter) &&
        (statusFilter === "Все" || item.status === statusFilter);
    });
  }, [allNews, categoryFilter, classFilter, query, role, statusFilter]);
  const classFilterOptions = useMemo(() => ["Все", ...uniqueNewsClasses([...newsClasses, ...allNews.map((item) => item.className).filter((value) => value !== "Все")])], [allNews, newsClasses]);
  const categoryFilterOptions = useMemo(() => ["Все", ...uniqueFilterValues([...newsCategories, ...allNews.map((item) => item.category)])], [allNews, newsCategories]);

  useEffect(() => {
    getAdminStore().then((store) => {
      setVisibility(store.newsVisibility);
      setOverrides(store.newsOverrides as Record<string, NewsItem>);
      setDeleted(store.newsDeleted);
      setNewsClasses(store.newsClasses.length ? store.newsClasses : defaultNewsClasses);
      setNewsCategories(store.newsCategories.length ? store.newsCategories : categories.map((category) => category.title));
    }).catch(() => {
      setVisibility({});
      setOverrides({});
      setDeleted({});
    });
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
    const store = await getAdminStore({ requireServer: true });
    const nextItem = {
      ...item,
      id: `copy-${Date.now()}`,
      slug: `${item.slug}-copy-${Date.now()}`,
      title: `Копия: ${item.title}`,
      status: "draft" as const
    };
    await patchAdminStore({ newsOverrides: { ...store.newsOverrides, [nextItem.slug]: nextItem } }, { requireServer: true });
    setOverrides((current) => ({ ...current, [nextItem.slug]: nextItem }));
    setMessage("Копия новости сохранена как черновик.");
  }

  async function deleteNews(item: NewsItem) {
    if (!window.confirm(`Удалить новость «${item.title}»? Она исчезнет с сайта и из админки.`)) return;
    try {
      const store = await getAdminStore({ requireServer: true });
      const nextOverrides = { ...store.newsOverrides };
      const nextVisibility = { ...store.newsVisibility };
      delete nextOverrides[item.slug];
      delete nextVisibility[item.slug];
      const saved = await patchAdminStore({
        newsOverrides: nextOverrides,
        newsVisibility: nextVisibility,
        newsDeleted: { ...store.newsDeleted, [item.slug]: true }
      }, { requireServer: true });
      setOverrides(saved.newsOverrides);
      setVisibility(saved.newsVisibility);
      setDeleted(saved.newsDeleted);
      setMessage("Новость удалена.");
      window.dispatchEvent(new CustomEvent("school46.news-updated"));
      window.dispatchEvent(new CustomEvent("school46.news-visibility-updated"));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Не удалось удалить новость.");
    }
  }

  async function addDictionaryValue(kind: "classes" | "categories", value: string) {
    const clean = value.trim();
    if (!clean) return;
    const current = kind === "classes" ? newsClasses : newsCategories;
    if (current.some((item) => item.toLocaleLowerCase("ru") === clean.toLocaleLowerCase("ru"))) {
      window.alert("Такое значение уже есть в списке.");
      return;
    }
    await saveDictionary(kind, [...current, clean]);
  }

  async function renameDictionaryValue(kind: "classes" | "categories", oldValue: string, value: string) {
    const clean = value.trim();
    if (!clean || clean === oldValue) return;
    const current = kind === "classes" ? newsClasses : newsCategories;
    if (current.some((item) => item !== oldValue && item.toLocaleLowerCase("ru") === clean.toLocaleLowerCase("ru"))) {
      window.alert("Такое значение уже есть в списке.");
      return;
    }
    const nextValues = current.map((item) => item === oldValue ? clean : item);
    await saveDictionary(kind, nextValues, { from: oldValue, to: clean });
  }

  async function deleteDictionaryValue(kind: "classes" | "categories", value: string) {
    if (!window.confirm(`Удалить «${value}» из справочника? В существующих новостях значение будет заменено.`)) return;
    const current = kind === "classes" ? newsClasses : newsCategories;
    let nextValues = current.filter((item) => item !== value);
    const replacement = kind === "classes" ? (nextValues[0] || "Без класса") : (nextValues[0] || "Без рубрики");
    if (!nextValues.length) nextValues = [replacement];
    await saveDictionary(kind, nextValues, { from: value, to: replacement });
  }

  async function saveDictionary(kind: "classes" | "categories", values: string[], replace?: { from: string; to: string }) {
    try {
      const store = await getAdminStore({ requireServer: true });
      const nextOverrides = { ...store.newsOverrides };
      if (replace) {
        mergeNewsItems(news, store.newsOverrides).forEach((item) => {
          const matches = kind === "classes" ? item.className === replace.from : item.category === replace.from;
          if (matches) nextOverrides[item.slug] = { ...item, [kind === "classes" ? "className" : "category"]: replace.to };
        });
      }
      const saved = await patchAdminStore(kind === "classes"
        ? { newsClasses: values, newsOverrides: nextOverrides }
        : { newsCategories: values, newsOverrides: nextOverrides }, { requireServer: true });
      setNewsClasses(saved.newsClasses.length ? saved.newsClasses : defaultNewsClasses);
      setNewsCategories(saved.newsCategories.length ? saved.newsCategories : categories.map((category) => category.title));
      setOverrides(saved.newsOverrides);
      setMessage("Справочник новостей обновлён.");
      window.dispatchEvent(new CustomEvent("school46.news-updated"));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Не удалось сохранить справочник.");
    }
  }

  return (
    <div>
      <SectionTitle
        eyebrow="Редактирование"
        title="Новости"
        action={<div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setDictionary("classes")} className="focus-ring flex items-center gap-2 rounded-[8px] border border-line bg-white px-3 py-3 text-sm font-semibold text-ink"><GraduationCap size={17} /> Классы</button>
          <button type="button" onClick={() => setDictionary("categories")} className="focus-ring flex items-center gap-2 rounded-[8px] border border-line bg-white px-3 py-3 text-sm font-semibold text-ink"><Tags size={17} /> Рубрики</button>
          <Link href="/admin/news/new" className="focus-ring flex items-center gap-2 rounded-[8px] bg-ink px-4 py-3 text-sm font-semibold text-white"><Plus size={17} /> Создать новость</Link>
        </div>}
      />
      <p className="mb-4 rounded-[8px] bg-mist px-4 py-3 text-sm leading-6 text-slate-600">
        Управляйте отображением новостей на главной странице и в ленте. Скрытая новость остаётся в админке, но не показывается посетителям.
      </p>
      {dictionary ? (
        <NewsDictionaryManager
          kind={dictionary}
          values={dictionary === "classes" ? newsClasses : newsCategories}
          onClose={() => setDictionary(null)}
          onAdd={(value) => addDictionaryValue(dictionary, value)}
          onRename={(oldValue, value) => renameDictionaryValue(dictionary, oldValue, value)}
          onDelete={(value) => deleteDictionaryValue(dictionary, value)}
        />
      ) : null}
      {message ? <p className="mb-4 rounded-[8px] bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
      <div className="rounded-[8px] border border-line bg-white p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-semibold text-ink"><Newspaper size={18} /> Лента новостей</h3>
          <span className="text-sm text-slate-500">Найдено: {visibleNews.length}</span>
        </div>
        <div className="mb-4 grid gap-3 rounded-[8px] bg-mist p-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_180px_220px_170px]">
          <label className="grid gap-1 text-sm font-semibold text-slate-600">Поиск
            <span className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Название или автор" className="focus-ring w-full rounded-[8px] border border-line bg-white py-2 pl-9 pr-3 font-normal text-ink" /></span>
          </label>
          <NewsFilter label="Класс" value={classFilter} options={classFilterOptions} onChange={setClassFilter} />
          <NewsFilter label="Рубрика" value={categoryFilter} options={categoryFilterOptions} onChange={setCategoryFilter} />
          <NewsFilter label="Статус" value={statusFilter} options={["Все", "published", "draft", "archived"]} labels={{ published: "Опубликована", draft: "Черновик", archived: "Архив" }} onChange={setStatusFilter} />
        </div>
        <div className="grid gap-2">
          {visibleNews.map((item) => {
            const published = item.status === "published" && visibility[item.slug] !== false;
            return (
              <div key={item.slug} className="rounded-[8px] border border-line bg-mist p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.date} · {newsStatusLabel(item.status)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-[6px] bg-white px-2 py-1 text-slate-600">Класс: {item.className}</span>
                    <span className="rounded-[6px] bg-blue-50 px-2 py-1 text-apple">Рубрика: {item.category}</span>
                  </div>
                </div>
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
                  <button type="button" onClick={() => deleteNews(item)} className="flex items-center gap-2 rounded-[8px] bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600">
                    <Trash2 size={15} /> Удалить
                  </button>
                </div>
              </div>
            );
          })}
          {!visibleNews.length ? <p className="rounded-[8px] border border-dashed border-line bg-white p-6 text-center text-sm text-slate-500">По выбранным фильтрам новостей нет.</p> : null}
        </div>
      </div>
    </div>
  );
}

function NewsDictionaryManager({ kind, values, onClose, onAdd, onRename, onDelete }: {
  kind: "classes" | "categories";
  values: string[];
  onClose: () => void;
  onAdd: (value: string) => Promise<void>;
  onRename: (oldValue: string, value: string) => Promise<void>;
  onDelete: (value: string) => Promise<void>;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [newValue, setNewValue] = useState("");
  const title = kind === "classes" ? "Классы для новостей" : "Рубрики новостей";

  useEffect(() => {
    setDrafts(Object.fromEntries(values.map((value) => [value, value])));
  }, [values]);

  return (
    <div className="mb-4 rounded-[8px] border border-apple/30 bg-[var(--accent-soft)] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div><h3 className="flex items-center gap-2 font-semibold text-ink"><BookOpen size={18} /> {title}</h3><p className="mt-1 text-xs text-slate-500">Изменения сразу попадут в редактор и фильтры новостей.</p></div>
        <button type="button" onClick={onClose} title="Закрыть справочник" aria-label="Закрыть справочник" className="focus-ring grid size-9 place-items-center rounded-[6px] bg-white text-slate-600"><X size={17} /></button>
      </div>
      <div className="grid gap-2">
        {values.map((value) => (
          <div key={value} className="flex gap-2">
            <input value={drafts[value] ?? value} onChange={(event) => setDrafts((current) => ({ ...current, [value]: event.target.value }))} className="focus-ring min-w-0 flex-1 rounded-[8px] border border-line bg-white px-3 py-2 text-sm text-ink" />
            <button type="button" onClick={() => onRename(value, drafts[value] ?? value)} title="Сохранить название" aria-label="Сохранить название" className="focus-ring grid size-10 place-items-center rounded-[8px] bg-white text-emerald-700"><Check size={17} /></button>
            <button type="button" onClick={() => onDelete(value)} title="Удалить значение" aria-label="Удалить значение" className="focus-ring grid size-10 place-items-center rounded-[8px] bg-rose-50 text-rose-600"><Trash2 size={17} /></button>
          </div>
        ))}
        <div className="mt-2 flex gap-2 border-t border-apple/20 pt-3">
          <input value={newValue} onChange={(event) => setNewValue(event.target.value)} placeholder={kind === "classes" ? "Название нового класса" : "Название новой рубрики"} className="focus-ring min-w-0 flex-1 rounded-[8px] border border-line bg-white px-3 py-2 text-sm text-ink" />
          <button type="button" onClick={async () => { await onAdd(newValue); setNewValue(""); }} className="focus-ring flex items-center gap-2 rounded-[8px] bg-ink px-4 py-2 text-sm font-semibold text-white"><Plus size={16} /> Добавить</button>
        </div>
      </div>
    </div>
  );
}

function NewsFilter({ label, value, options, labels, onChange }: { label: string; value: string; options: string[]; labels?: Record<string, string>; onChange: (value: string) => void }) {
  return <label className="grid gap-1 text-sm font-semibold text-slate-600">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="focus-ring min-w-0 rounded-[8px] border border-line bg-white px-3 py-2 font-normal text-ink">{options.map((option) => <option key={option} value={option}>{labels?.[option] || option}</option>)}</select></label>;
}

function newsStatusLabel(status: NewsItem["status"]) {
  return status === "published" ? "Опубликована" : status === "draft" ? "Черновик" : "Архив";
}

type EventPageDraft = {
  title: string;
  category: string;
  startDate: string;
  endDate?: string;
  deadline?: string;
  acceptApplications?: boolean;
  status: string;
  slug: string;
  published?: boolean;
  autoHideDate?: string;
};

function eventDraftMonthLabel(date: string | undefined) {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return "Без даты";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "Без даты";
  return new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(parsed);
}

function uniqueFilterValues(values: string[]) {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

function EventsEditor({ title, drafts, error }: { title: string; drafts: EventPageDraft[]; error: string }) {
  const visibleDrafts = drafts;
  const [manualDrafts, setManualDrafts] = useState(visibleDrafts);
  const [manualMonthFilter, setManualMonthFilter] = useState("Все месяцы");
  const [manualCategoryFilter, setManualCategoryFilter] = useState("Все типы");
  const [copyMessage, setCopyMessage] = useState<{ text: string; error: boolean } | null>(null);
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
    setManualDrafts(visibleDrafts);
  }, [visibleDrafts]);

  async function toggleManualPage(slug: string) {
    try {
      const saved = await mutateAdminEventPage({ action: "toggle", slug });
      setManualDrafts(saved.eventPages as EventPageDraft[]);
    } catch (saveError) {
      window.alert(saveError instanceof Error ? saveError.message : "Не удалось изменить видимость мероприятия.");
    }
  }

  async function deleteManualPage(slug: string) {
    const confirmed = window.confirm("Удалить страницу мероприятия? Вернуть её будет уже невозможно.");
    if (!confirmed) return;
    try {
      const saved = await mutateAdminEventPage({ action: "delete", slug });
      setManualDrafts(saved.eventPages as EventPageDraft[]);
    } catch (saveError) {
      window.alert(saveError instanceof Error ? saveError.message : "Не удалось удалить мероприятие.");
    }
  }

  async function copyManualPage(slug: string) {
    setCopyMessage(null);
    try {
      const saved = await mutateAdminEventPage({ action: "copy", slug });
      setManualDrafts(saved.eventPages as EventPageDraft[]);
      const copyTitle = typeof saved.eventPage?.title === "string" ? saved.eventPage.title : "мероприятия";
      setCopyMessage({ text: `Копия «${copyTitle}» создана и скрыта с сайта.`, error: false });
    } catch (copyError) {
      setCopyMessage({
        text: copyError instanceof Error ? copyError.message : "Не удалось создать копию.",
        error: true
      });
    }
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
        События из Google-таблицы показываются только в публичном календаре. В админке редактируются только вручную созданные страницы мероприятий.
      </p>
      {error ? (
        <p className="mb-4 rounded-[8px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          {error} Уже созданные мероприятия не удалены; пока серверные данные не загрузились, сохранение списка заблокировано.
        </p>
      ) : null}
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
                onCopy={copyManualPage}
                onToggle={toggleManualPage}
                onDelete={deleteManualPage}
              />
              {copyMessage ? (
                <p className={`mt-3 rounded-[8px] border px-4 py-3 text-sm font-semibold ${copyMessage.error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
                  {copyMessage.text}
                </p>
              ) : null}
              {!filteredManualDrafts.length ? <p className="rounded-[8px] bg-mist px-4 py-3 text-sm text-slate-500">По выбранным фильтрам страниц нет.</p> : null}
            </div>
          ) : error ? null : (
            <p className="rounded-[8px] bg-mist px-4 py-3 text-sm text-slate-500">Пока нет вручную созданных страниц мероприятий.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ApplicationsTable({ applications, setApplications, eventDrafts }: { applications: ApplicationItem[]; setApplications: (items: ApplicationItem[]) => void; eventDrafts: EventPageDraft[] }) {
  const [selectedEvent, setSelectedEvent] = useState("");
  const [typeFilter, setTypeFilter] = useState("Все");
  const [classFilter, setClassFilter] = useState("Все");
  const [statusFilter, setStatusFilter] = useState("Все");
  const [activeApplication, setActiveApplication] = useState<ApplicationItem | null>(null);
  const [attachmentsApplication, setAttachmentsApplication] = useState<ApplicationItem | null>(null);
  const [editingApplication, setEditingApplication] = useState<ApplicationItem | null>(null);
  const [message, setMessage] = useState("");
  const [googleSheetUrl, setGoogleSheetUrl] = useState("");
  const [exportingGoogle, setExportingGoogle] = useState("");
  const [exportRecords, setExportRecords] = useState<Record<string, ApplicationExportRecord>>({});
  const [cleaningAttachments, setCleaningAttachments] = useState(false);
  const [googleConnection, setGoogleConnection] = useState<GoogleExportConnection | null>(null);
  const [checkingGoogle, setCheckingGoogle] = useState(false);
  const [googleGuideOpen, setGoogleGuideOpen] = useState(false);
  const [copiedGoogleValue, setCopiedGoogleValue] = useState("");
  const eventGroups = useMemo(() => groupApplicationsByEvent(applications, eventDrafts), [applications, eventDrafts]);
  const selectedApplications = selectedEvent ? applications.filter((item) => item.eventTitle === selectedEvent) : [];
  const selectedGroup = eventGroups.find((group) => group.title === selectedEvent);
  const filtered = selectedApplications.filter((item) =>
    (typeFilter === "Все" || item.eventType === typeFilter) &&
    (classFilter === "Все" || item.className === classFilter) &&
    (statusFilter === "Все" || item.status === statusFilter)
  );
  const classOptions = useMemo(() => ["Все", ...uniqueFilterValues(selectedApplications.map((item) => item.className))], [selectedApplications]);
  const typeOptions = useMemo(() => ["Все", ...uniqueFilterValues(selectedApplications.map((item) => item.eventType))], [selectedApplications]);

  useEffect(() => {
    getAdminStore({ requireServer: true })
      .then((store) => setExportRecords(store.applicationExports))
      .catch(() => setExportRecords({}));
    checkGoogleConnection(false);
  }, []);

  async function checkGoogleConnection(verify = true) {
    setCheckingGoogle(true);
    try {
      setGoogleConnection(await fetchGoogleExportStatus(verify));
    } catch (error) {
      setGoogleConnection({
        configured: false,
        verified: false,
        spreadsheetUrl: "",
        serviceAccountEmail: "",
        message: error instanceof Error ? error.message : "Не удалось проверить подключение."
      });
    } finally {
      setCheckingGoogle(false);
    }
  }

  async function refresh() {
    const [nextApplications, store] = await Promise.all([fetchApplications(), getAdminStore({ requireServer: true })]);
    setApplications(nextApplications);
    setExportRecords(store.applicationExports);
    setMessage("Список заявок обновлён.");
    setGoogleSheetUrl("");
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
    setGoogleSheetUrl("");
  }

  async function exportToGoogle(eventTitle: string) {
    setExportingGoogle(eventTitle);
    setMessage("");
    setGoogleSheetUrl("");
    try {
      const result = await exportApplicationsToGoogle(eventTitle);
      setExportRecords((current) => ({ ...current, [eventTitle]: result.exportRecord }));
      setMessage(`Выгружено заявок: ${result.applications}. Обновлено листов: ${result.sheets.length}.`);
      setGoogleSheetUrl(result.spreadsheetUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось выгрузить заявки в Google Таблицу.");
    } finally {
      setExportingGoogle("");
    }
  }

  async function cleanupAttachments() {
    if (!window.confirm("Удалить из хранилища все вложения старше одного года? Сами заявки сохранятся.")) return;
    setCleaningAttachments(true);
    setMessage("");
    setGoogleSheetUrl("");
    try {
      const deleted = await cleanupExpiredAttachments();
      setApplications(await fetchApplications());
      setMessage(deleted ? `Удалено просроченных вложений: ${deleted}.` : "Просроченных вложений пока нет.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось очистить просроченные вложения.");
    } finally {
      setCleaningAttachments(false);
    }
  }

  async function copyGoogleValue(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedGoogleValue(label);
      window.setTimeout(() => setCopiedGoogleValue((current) => current === label ? "" : current), 1800);
    } catch {
      setMessage("Не удалось скопировать. Выделите значение вручную.");
    }
  }

  function openEvent(title: string) {
    setSelectedEvent(title);
    setTypeFilter("Все");
    setClassFilter("Все");
    setStatusFilter("Все");
    setMessage("");
    setGoogleSheetUrl("");
  }

  return (
    <div className="grid gap-4">
      <SectionTitle eyebrow="Администрирование" title="Заявки" />
      <div className={`rounded-[8px] border px-4 py-3 text-sm ${googleConnection?.verified ? "border-emerald-200 bg-emerald-50 text-emerald-800" : googleConnection?.configured ? "border-sky-200 bg-sky-50 text-sky-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold">
              {googleConnection?.verified ? "Google Таблица подключена и доступна" : googleConnection?.configured ? "Данные Google сохранены — проверьте доступ" : "Google Таблица ещё не подключена"}
            </p>
            <p className="mt-1 leading-6">
              {googleConnection?.message ?? "Проверяем настройки подключения..."}
              {!googleConnection?.configured ? " Подключение выполняется в Timeweb: Настройки приложения → переменные окружения. Нужны GOOGLE_SERVICE_ACCOUNT_EMAIL и GOOGLE_PRIVATE_KEY." : null}
            </p>
            {googleConnection?.serviceAccountEmail ? <p className="mt-1 break-all text-xs">Сервисный аккаунт: {googleConnection.serviceAccountEmail}. Он должен быть добавлен в таблицу как редактор.</p> : null}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button type="button" onClick={() => checkGoogleConnection(true)} disabled={checkingGoogle} className="focus-ring flex items-center gap-2 rounded-[8px] bg-white px-3 py-2 font-semibold text-ink shadow-sm disabled:cursor-wait disabled:text-slate-400">
              <RefreshCw size={16} className={checkingGoogle ? "animate-spin" : ""} />
              {checkingGoogle ? "Проверяем..." : "Проверить подключение"}
            </button>
            {googleConnection?.spreadsheetUrl ? <a href={googleConnection.spreadsheetUrl} target="_blank" rel="noreferrer" className="focus-ring flex items-center gap-2 rounded-[8px] bg-white px-3 py-2 font-semibold text-ink shadow-sm"><FileSpreadsheet size={16} />Открыть таблицу</a> : null}
            {!googleConnection?.verified ? (
              <button type="button" onClick={() => setGoogleGuideOpen((current) => !current)} className="focus-ring flex items-center gap-2 rounded-[8px] bg-ink px-3 py-2 font-semibold text-white shadow-sm">
                <KeyRound size={16} />
                {googleGuideOpen ? "Скрыть подключение" : "Настроить подключение"}
              </button>
            ) : null}
          </div>
        </div>
        {googleGuideOpen && !googleConnection?.verified ? (
          <div className="mt-4 border-t border-current/15 pt-4 text-ink">
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-[8px] bg-white p-3 shadow-sm">
                <p className="font-semibold">1. Новый ключ Google</p>
                <p className="mt-1 leading-6 text-slate-600">Откройте сервисный аккаунт, создайте ключ типа JSON и скачайте файл.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href="https://console.cloud.google.com/iam-admin/serviceaccounts" target="_blank" rel="noreferrer" className="focus-ring flex items-center gap-2 rounded-[8px] bg-mist px-3 py-2 font-semibold text-ink"><ExternalLink size={15} />Сервисные аккаунты</a>
                  <a href="https://console.cloud.google.com/apis/library/sheets.googleapis.com" target="_blank" rel="noreferrer" className="focus-ring flex items-center gap-2 rounded-[8px] bg-mist px-3 py-2 font-semibold text-ink"><ExternalLink size={15} />Google Sheets API</a>
                </div>
              </div>
              <div className="rounded-[8px] bg-white p-3 shadow-sm">
                <p className="font-semibold">2. Переменные Timeweb</p>
                <p className="mt-1 leading-6 text-slate-600">Вставьте значения из JSON без сокращений и кавычек.</p>
                <div className="mt-3 grid gap-2">
                  <GoogleVariableRow jsonField="client_email" variable="GOOGLE_SERVICE_ACCOUNT_EMAIL" copied={copiedGoogleValue} onCopy={copyGoogleValue} />
                  <GoogleVariableRow jsonField="private_key" variable="GOOGLE_PRIVATE_KEY" copied={copiedGoogleValue} onCopy={copyGoogleValue} />
                </div>
                <a href="https://timeweb.cloud/my/apps/250153/settings" target="_blank" rel="noreferrer" className="focus-ring mt-3 flex w-fit items-center gap-2 rounded-[8px] bg-mist px-3 py-2 font-semibold text-ink"><ExternalLink size={15} />Открыть Timeweb</a>
              </div>
              <div className="rounded-[8px] bg-white p-3 shadow-sm lg:col-span-2">
                <p className="font-semibold">3. Доступ к таблице</p>
                <p className="mt-1 leading-6 text-slate-600">В Google Таблице нажмите «Настройки доступа» и добавьте сервисный аккаунт с ролью «Редактор».</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {googleConnection?.serviceAccountEmail ? (
                    <button type="button" onClick={() => copyGoogleValue(googleConnection.serviceAccountEmail, "service-email")} className="focus-ring flex items-center gap-2 rounded-[8px] bg-mist px-3 py-2 font-semibold text-ink">
                      {copiedGoogleValue === "service-email" ? <Check size={15} /> : <Copy size={15} />}
                      {copiedGoogleValue === "service-email" ? "Адрес скопирован" : "Скопировать адрес аккаунта"}
                    </button>
                  ) : null}
                  {googleConnection?.spreadsheetUrl ? <a href={googleConnection.spreadsheetUrl} target="_blank" rel="noreferrer" className="focus-ring flex items-center gap-2 rounded-[8px] bg-mist px-3 py-2 font-semibold text-ink"><FileSpreadsheet size={15} />Открыть таблицу</a> : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      {message ? (
        <p className="rounded-[8px] bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {message}
          {googleSheetUrl ? <a href={googleSheetUrl} target="_blank" rel="noreferrer" className="ml-2 underline">Открыть таблицу</a> : null}
        </p>
      ) : null}
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
            <button type="button" onClick={() => downloadApplicationsAttachments(applications)} disabled={!countDownloadableAttachments(applications)} className="flex items-center gap-2 rounded-[8px] bg-white px-4 py-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:text-slate-400">
              <Download size={17} />
              Скачать все вложения
            </button>
            <button type="button" onClick={cleanupAttachments} disabled={cleaningAttachments} className="flex items-center gap-2 rounded-[8px] bg-white px-4 py-3 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:text-slate-400">
              <Clock3 size={17} />
              {cleaningAttachments ? "Проверяем..." : "Очистить вложения старше года"}
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {!eventGroups.length ? <p className="rounded-[8px] bg-mist px-4 py-3 text-sm text-slate-500">Пока нет заявок.</p> : null}
            {eventGroups.map((group) => (
              <div key={group.title} className="rounded-[8px] border border-line bg-white p-4 shadow-sm">
                <button type="button" onClick={() => openEvent(group.title)} className="focus-ring block w-full text-left">
                  <span className="block text-sm font-semibold text-slate-500">{eventTypeLabel(group.type)}</span>
                  <span className="mt-1 block text-lg font-semibold text-ink">{group.title}</span>
                  <span className="mt-3 inline-flex rounded-[8px] bg-mist px-3 py-2 text-sm font-semibold text-slate-700">{group.count} {applicationCountLabel(group.count)}</span>
                </button>
                <ApplicationExportStatus group={group} record={exportRecords[group.title]} />
                <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                  <button type="button" onClick={() => openEvent(group.title)} className="rounded-[8px] bg-mist px-3 py-2 text-sm font-semibold text-slate-700">Открыть заявки</button>
                  <button type="button" onClick={() => exportToGoogle(group.title)} disabled={Boolean(exportingGoogle) || googleConnection?.configured === false} className="flex items-center gap-2 rounded-[8px] bg-ink px-3 py-2 text-sm font-semibold text-white disabled:cursor-wait disabled:bg-slate-400">
                    <FileSpreadsheet size={16} />
                    {exportingGoogle === group.title ? "Выгружаем..." : "Выгрузить в Google Таблицу"}
                  </button>
                </div>
              </div>
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
              {selectedGroup ? <ApplicationExportStatus group={selectedGroup} record={exportRecords[selectedEvent]} compact /> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => downloadApplicationsAttachments(filtered)} disabled={!countDownloadableAttachments(filtered)} className="flex items-center gap-2 rounded-[8px] bg-white px-4 py-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:text-slate-400">
                <Download size={17} />
                Скачать все вложения
              </button>
              <button type="button" onClick={() => downloadApplicationsExcel(filtered)} disabled={!filtered.length} className="flex items-center gap-2 rounded-[8px] bg-ink px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">
                <Download size={17} />
                Скачать Excel
              </button>
              <button type="button" onClick={() => exportToGoogle(selectedEvent)} disabled={!selectedApplications.length || Boolean(exportingGoogle) || googleConnection?.configured === false} className="flex items-center gap-2 rounded-[8px] bg-white px-4 py-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:text-slate-400">
                <FileSpreadsheet size={17} />
                {exportingGoogle === selectedEvent ? "Выгружаем..." : "Выгрузить в Google Таблицу"}
              </button>
            </div>
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
                    {item.files?.length ? (
                      <button type="button" onClick={() => setAttachmentsApplication(item)} className="focus-ring mt-1 rounded-[6px] text-sm font-semibold text-apple underline decoration-apple/30 underline-offset-2 hover:decoration-apple">
                        Вложения: {item.files.length}
                      </button>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.files?.length ? (
                      <button type="button" onClick={() => downloadApplicationAttachments(item)} disabled={!countDownloadableAttachments([item])} className="flex items-center gap-2 rounded-[8px] bg-mist px-3 py-2 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:text-slate-400">
                        <Download size={15} />
                        Скачать вложения
                      </button>
                    ) : null}
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
      {attachmentsApplication ? <ApplicationAttachmentsModal application={attachmentsApplication} onClose={() => setAttachmentsApplication(null)} /> : null}
      {editingApplication ? <ApplicationEditModal application={editingApplication} onClose={() => setEditingApplication(null)} onSave={saveApplication} /> : null}
    </div>
  );
}

function ApplicationAttachmentsModal({ application, onClose }: { application: ApplicationItem; onClose: () => void }) {
  useModalBehavior(onClose);
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-ink/50 p-3 sm:p-4">
      <div role="dialog" aria-modal="true" aria-label="Вложения заявки" className="mx-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl overflow-y-auto overscroll-contain rounded-[8px] bg-white p-5 shadow-soft sm:max-h-[calc(100dvh-2rem)]">
        <div className="sticky top-0 z-10 -mx-5 -mt-5 mb-4 flex items-start justify-between gap-4 border-b border-line bg-white px-5 pb-3 pt-5">
          <div>
            <p className="text-sm font-semibold text-apple">{application.eventTitle}</p>
            <h3 className="text-2xl font-semibold text-ink">Вложения: {application.student || "заявка"}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-[8px] bg-mist px-3 py-2 text-sm font-semibold text-slate-600">Закрыть</button>
        </div>
        <ApplicationFiles application={application} />
      </div>
    </div>
  );
}

function ApplicationDetailsModal({ application, onClose }: { application: ApplicationItem; onClose: () => void }) {
  useModalBehavior(onClose);
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-ink/40 p-3 sm:p-4">
      <div role="dialog" aria-modal="true" aria-label="Просмотр заявки" className="mx-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl overflow-y-auto overscroll-contain rounded-[8px] bg-white p-5 shadow-soft sm:max-h-[calc(100dvh-2rem)]">
        <div className="sticky top-0 z-10 -mx-5 -mt-5 mb-4 flex items-start justify-between gap-4 border-b border-line bg-white px-5 pb-3 pt-5">
          <div>
            <p className="text-sm font-semibold text-apple">{application.eventTitle}</p>
            <h3 className="text-2xl font-semibold text-ink">{application.student || "Заявка"}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-[8px] bg-mist px-3 py-2 text-sm font-semibold text-slate-600">Закрыть</button>
        </div>
        <ApplicationInfoGrid application={application} />
        <ApplicationFiles application={application} />
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
  useModalBehavior(onClose);

  function updateField(field: keyof ApplicationItem, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-ink/40 p-3 sm:p-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave(draft);
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Изменение заявки"
        className="mx-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl overflow-y-auto overscroll-contain rounded-[8px] bg-white p-5 shadow-soft sm:max-h-[calc(100dvh-2rem)]"
      >
        <div className="sticky top-0 z-10 -mx-5 -mt-5 mb-4 flex items-start justify-between gap-4 border-b border-line bg-white px-5 pb-3 pt-5">
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
        <ApplicationFiles application={draft} />
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

function useModalBehavior(onClose: () => void) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);
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

function ApplicationFiles({ application }: { application: ApplicationItem }) {
  const files = application.files ?? [];
  const [preview, setPreview] = useState<{ file: ApplicationAttachment; index: number } | null>(null);
  useEffect(() => {
    if (!preview) return;
    const closePreview = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopImmediatePropagation();
      setPreview(null);
    };
    window.addEventListener("keydown", closePreview, true);
    return () => window.removeEventListener("keydown", closePreview, true);
  }, [preview]);
  if (!files.length) return null;
  const downloadable = countDownloadableAttachments([application]);
  return (
    <div className="mt-4 rounded-[8px] border border-line bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-semibold text-ink">Вложения</h4>
        <button type="button" onClick={() => downloadApplicationAttachments(application)} disabled={!downloadable} className="flex items-center gap-2 rounded-[8px] bg-ink px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">
          <Download size={15} />
          Скачать вложения
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {files.map((file, index) => {
          const source = file.url || file.dataUrl;
          return (
          <div key={`${file.name}-${file.size}`} className="rounded-[8px] border border-line bg-mist p-3">
            {source && isPreviewableAttachment(file) ? (
              <button type="button" onClick={() => setPreview({ file, index })} className="focus-ring break-words text-left text-sm font-semibold text-apple underline decoration-apple/30 underline-offset-2 hover:decoration-apple">
                {file.name}
              </button>
            ) : <p className="break-words text-sm font-semibold text-ink">{file.name}</p>}
            <p className="mt-1 text-xs text-slate-500">{file.type || "файл"} · {formatFileSize(file.size)}</p>
            <p className="mt-1 text-xs text-slate-500">Хранится до: {formatAttachmentDeleteDate(file.deleteAfter, application.createdAt)}</p>
            {source ? (
              <>
                {file.type.startsWith("image/") ? (
                  <button type="button" onClick={() => setPreview({ file, index })} className="focus-ring mt-3 block w-full overflow-hidden rounded-[8px] border border-line bg-white" aria-label={`Открыть ${file.name}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={source} alt={file.name} className="max-h-64 w-full object-contain" />
                  </button>
                ) : null}
                {isPdfAttachment(file) ? (
                  <button type="button" onClick={() => setPreview({ file, index })} className="mt-3 w-full rounded-[8px] bg-white px-3 py-2 text-sm font-semibold text-apple">Открыть просмотр</button>
                ) : null}
                <button type="button" onClick={() => downloadAttachment(application, file, index)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-[8px] bg-white px-3 py-2 text-sm font-semibold text-ink">
                  <Download size={15} />
                  Скачать файл
                </button>
              </>
            ) : (
              <p className="mt-3 rounded-[8px] bg-white px-3 py-2 text-xs font-semibold text-slate-500">Файл сохранён без содержимого. Скачать можно будет для новых вложений.</p>
            )}
          </div>
          );
        })}
      </div>
      {preview ? <AttachmentPreviewModal application={application} file={preview.file} index={preview.index} onClose={() => setPreview(null)} /> : null}
    </div>
  );
}

function AttachmentPreviewModal({ application, file, index, onClose }: { application: ApplicationItem; file: ApplicationAttachment; index: number; onClose: () => void }) {
  const source = file.url || file.dataUrl || "";
  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto overscroll-contain bg-ink/70 p-3 sm:p-5">
      <div role="dialog" aria-modal="true" aria-label={`Просмотр ${file.name}`} className="mx-auto flex min-h-[calc(100dvh-1.5rem)] w-full max-w-6xl flex-col rounded-[8px] bg-white p-4 shadow-soft sm:min-h-[calc(100dvh-2.5rem)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{file.name}</p>
            <p className="text-xs text-slate-500">{file.type || "файл"} · {formatFileSize(file.size)}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => downloadAttachment(application, file, index)} className="flex items-center gap-2 rounded-[8px] bg-ink px-3 py-2 text-sm font-semibold text-white">
              <Download size={15} />
              Скачать
            </button>
            <button type="button" onClick={onClose} className="rounded-[8px] bg-mist px-3 py-2 text-sm font-semibold text-slate-600">Закрыть</button>
          </div>
        </div>
        <div className="grid flex-1 place-items-center overflow-hidden rounded-[8px] bg-mist">
          {file.type.startsWith("image/") ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={source} alt={file.name} className="max-h-[calc(100dvh-9rem)] max-w-full object-contain" />
            </>
          ) : isPdfAttachment(file) ? (
            <iframe src={source} title={file.name} className="h-[calc(100dvh-9rem)] w-full bg-white" />
          ) : (
            <p className="max-w-md p-6 text-center text-sm leading-6 text-slate-600">Предпросмотр этого формата браузером не поддерживается. Файл можно безопасно скачать.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function isPreviewableAttachment(file: ApplicationAttachment) {
  return file.type.startsWith("image/") || isPdfAttachment(file);
}

function isPdfAttachment(file: ApplicationAttachment) {
  return file.type === "application/pdf" || fileExtension(file.name) === "pdf";
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
    getAdminStore({ requireServer: true })
      .then((store) => {
        const next = { ...defaultHomeSectionSettings(), ...store.homeSections } as Record<HomeSectionId, boolean>;
        setHomeSettings(next);
        setSavedHomeSettings(next);
      })
      .catch(() => {
        const defaults = defaultHomeSectionSettings();
        setHomeSettings(defaults);
        setSavedHomeSettings(defaults);
        setHomeSettingsMessage("Не удалось загрузить настройки с сервера.");
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
    setHomeSettingsMessage("Сохраняю настройки...");
    try {
      const saved = await patchAdminStore({ homeSections: homeSettings }, { requireServer: true });
      const next = { ...defaultHomeSectionSettings(), ...saved.homeSections } as Record<HomeSectionId, boolean>;
      setHomeSettings(next);
      setSavedHomeSettings(next);
      setHomeSettingsMessage("Настройки блоков сохранены на сервере.");
      window.dispatchEvent(new CustomEvent("school46.home-sections-updated"));
    } catch (error) {
      setHomeSettingsMessage(error instanceof Error ? error.message : "Не удалось сохранить настройки на сервере.");
    }
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
  onCopy,
  onToggle,
  onDelete,
  compact = false
}: {
  title?: string;
  description?: string;
  items: string[];
  actions: Array<{ label: string; href: string; publicHref?: string; slug?: string; adminOnly?: boolean; published?: boolean }>;
  onCopy?: (slug: string) => void | Promise<void>;
  onToggle?: (slug: string) => void;
  onDelete?: (slug: string) => void;
  compact?: boolean;
}) {
  const [copyingSlug, setCopyingSlug] = useState("");

  async function copyPage(slug: string) {
    if (!onCopy || copyingSlug) return;
    setCopyingSlug(slug);
    try {
      await onCopy(slug);
    } finally {
      setCopyingSlug("");
    }
  }

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
              {onCopy ? (
                <button
                  type="button"
                  disabled={Boolean(copyingSlug)}
                  onClick={() => copyPage(actions[index]?.slug ?? "")}
                  className="flex items-center gap-2 rounded-[8px] bg-white px-3 py-2 text-sm font-semibold text-slate-600 disabled:cursor-wait disabled:opacity-60"
                >
                  <Copy size={15} />
                  {copyingSlug === actions[index]?.slug ? "Создаём…" : "Создать копию"}
                </button>
              ) : (
                <Link href={`/admin/events/new?copy=${encodeURIComponent(actions[index]?.slug ?? "")}`} className="flex items-center gap-2 rounded-[8px] bg-white px-3 py-2 text-sm font-semibold text-slate-600">
                  <Copy size={15} />
                  Создать копию
                </Link>
              )}
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

async function exportApplicationsToGoogle(eventTitle: string) {
  const response = await fetch("/api/applications/export-google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventTitle })
  });
  const data = await response.json().catch(() => ({})) as {
    message?: string;
    spreadsheetUrl?: string;
    sheets?: string[];
    applications?: number;
    exportRecord?: ApplicationExportRecord;
  };
  if (!response.ok) throw new Error(data.message || "Не удалось выгрузить заявки в Google Таблицу.");
  if (!data.exportRecord) throw new Error("Google Таблица обновлена, но сервер не вернул отметку о выгрузке.");
  return {
    spreadsheetUrl: data.spreadsheetUrl ?? "",
    sheets: data.sheets ?? [],
    applications: data.applications ?? 0,
    exportRecord: data.exportRecord
  };
}

type GoogleExportConnection = {
  configured: boolean;
  verified: boolean;
  spreadsheetUrl: string;
  serviceAccountEmail: string;
  message: string;
};

async function fetchGoogleExportStatus(verify: boolean): Promise<GoogleExportConnection> {
  const response = await fetch(`/api/applications/export-google${verify ? "?verify=1" : ""}`, { cache: "no-store" });
  const data = await response.json().catch(() => ({})) as Partial<GoogleExportConnection> & { message?: string };
  if (!response.ok) throw new Error(data.message || "Не удалось проверить подключение к Google Таблице.");
  return {
    configured: Boolean(data.configured),
    verified: Boolean(data.verified),
    spreadsheetUrl: data.spreadsheetUrl ?? "",
    serviceAccountEmail: data.serviceAccountEmail ?? "",
    message: data.message ?? "Статус подключения получен."
  };
}

async function cleanupExpiredAttachments() {
  const response = await fetch("/api/applications/attachments/cleanup", { method: "POST" });
  const data = await response.json().catch(() => ({})) as { deleted?: number; message?: string };
  if (!response.ok) throw new Error(data.message || "Не удалось очистить просроченные вложения.");
  return data.deleted ?? 0;
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

async function downloadApplicationsAttachments(items: ApplicationItem[]) {
  const downloads = items.flatMap((application) => downloadableAttachments(application));
  for (const { application, file, index } of downloads) {
    await downloadAttachment(application, file, index);
  }
}

function downloadApplicationAttachments(application: ApplicationItem) {
  downloadApplicationsAttachments([application]);
}

function downloadableAttachments(application: ApplicationItem) {
  return (application.files ?? [])
    .map((file, index) => ({ application, file, index }))
    .filter((item) => Boolean(item.file.dataUrl || item.file.url));
}

function countDownloadableAttachments(items: ApplicationItem[]) {
  return items.reduce((count, application) => count + downloadableAttachments(application).length, 0);
}

async function downloadAttachment(application: ApplicationItem, file: NonNullable<ApplicationItem["files"]>[number], index: number) {
  try {
    const blob = file.dataUrl
      ? dataUrlToBlob(file.dataUrl)
      : file.url
        ? await fetchAttachmentBlob(file.url)
        : null;
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = applicationAttachmentFileName(application, file, index);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch {
    window.alert(`Не удалось скачать файл "${file.name}".`);
  }
}

async function fetchAttachmentBlob(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Attachment download failed");
  return response.blob();
}

function applicationAttachmentFileName(application: ApplicationItem, file: NonNullable<ApplicationItem["files"]>[number], index: number) {
  const prefix = safeFilePart([application.className, application.student || application.contact || "zayavka"].filter(Boolean).join("_"));
  const extension = fileExtension(file.name) || extensionFromMime(file.type) || extensionFromDataUrl(file.dataUrl) || "file";
  const suffix = (application.files?.length ?? 0) > 1 ? `_${index + 1}` : "";
  return `${prefix}${suffix}.${extension}`;
}

function dataUrlToBlob(dataUrl: string) {
  const [meta, payload = ""] = dataUrl.split(",");
  const mime = meta.match(/^data:([^;]+)/)?.[1] || "application/octet-stream";
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mime });
}

function safeFilePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[а-яё]/g, (letter) => translit[letter] ?? "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 90) || `zayavka_${Date.now()}`;
}

function fileExtension(name: string) {
  return name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "";
}

function extensionFromMime(type: string) {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "application/pdf") return "pdf";
  if (type.includes("wordprocessingml")) return "docx";
  if (type.includes("spreadsheetml")) return "xlsx";
  if (type.includes("zip")) return "zip";
  return "";
}

function extensionFromDataUrl(dataUrl: string | undefined) {
  const mime = dataUrl?.match(/^data:([^;]+)/)?.[1] || "";
  return extensionFromMime(mime);
}

function formatDateTime(value: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ru-RU");
}

function formatAttachmentDeleteDate(deleteAfter: string | undefined, applicationCreatedAt: string) {
  const date = new Date(deleteAfter || applicationCreatedAt);
  if (Number.isNaN(date.getTime())) return "не указано";
  if (!deleteAfter) date.setUTCFullYear(date.getUTCFullYear() + 1);
  return date.toLocaleDateString("ru-RU");
}

type ApplicationEventGroup = {
  title: string;
  type: ApplicationItem["eventType"];
  count: number;
  eventId: string;
  latestApplicationAt: string;
  deadline: string;
};

function groupApplicationsByEvent(items: ApplicationItem[], eventDrafts: EventPageDraft[]): ApplicationEventGroup[] {
  const groups = new Map<string, Omit<ApplicationEventGroup, "deadline"> & { storedDeadline: string }>();
  for (const item of items) {
    const title = item.eventTitle || item.contest || "Мероприятие";
    const changedAt = item.updatedAt || item.createdAt || "";
    const current = groups.get(title);
    if (current) {
      current.count += 1;
      if (Date.parse(changedAt) > Date.parse(current.latestApplicationAt || "1970-01-01")) current.latestApplicationAt = changedAt;
      if (!current.eventId && item.eventId) current.eventId = item.eventId;
      if (!current.storedDeadline && item.eventDeadline) current.storedDeadline = item.eventDeadline;
    } else {
      groups.set(title, { title, type: item.eventType, count: 1, eventId: item.eventId || "", latestApplicationAt: changedAt, storedDeadline: item.eventDeadline || "" });
    }
  }
  return Array.from(groups.values())
    .map((group) => {
      const slug = group.eventId.startsWith("manual-") ? group.eventId.slice("manual-".length) : "";
      const draft = eventDrafts.find((item) => (slug && item.slug === slug) || item.title === group.title);
      const { storedDeadline, ...base } = group;
      return { ...base, deadline: draft?.deadline || storedDeadline };
    })
    .sort((first, second) => first.title.localeCompare(second.title, "ru"));
}

function GoogleVariableRow({ jsonField, variable, copied, onCopy }: {
  jsonField: string;
  variable: string;
  copied: string;
  onCopy: (value: string, label: string) => Promise<void>;
}) {
  const isCopied = copied === variable;
  return (
    <div className="flex min-w-0 items-center justify-between gap-2 rounded-[8px] border border-line px-3 py-2">
      <p className="min-w-0 text-xs text-slate-600">
        <code className="font-semibold text-ink">{jsonField}</code>
        <span className="mx-2">→</span>
        <code className="break-all font-semibold text-ink">{variable}</code>
      </p>
      <button type="button" onClick={() => onCopy(variable, variable)} title={`Скопировать ${variable}`} className="focus-ring grid size-8 shrink-0 place-items-center rounded-[8px] bg-mist text-ink">
        {isCopied ? <Check size={15} /> : <Copy size={15} />}
      </button>
    </div>
  );
}

function ApplicationExportStatus({ group, record, compact = false }: { group: ApplicationEventGroup; record?: ApplicationExportRecord; compact?: boolean }) {
  const deadlinePassed = isApplicationDeadlinePassed(group.deadline);
  const hasChanges = record ? (
    record.applicationCount !== group.count ||
    Date.parse(group.latestApplicationAt || "1970-01-01") > Date.parse(record.latestApplicationAt || "1970-01-01")
  ) : false;
  let status = "Выгрузка ещё не выполнялась.";
  let statusClass = "bg-slate-50 text-slate-700";

  if (deadlinePassed && !record) {
    status = "Приём заявок завершён. Необходимо выполнить выгрузку.";
    statusClass = "bg-amber-50 text-amber-900";
  } else if (record && hasChanges) {
    status = "После последней выгрузки появились новые или изменённые заявки. Выполните выгрузку повторно.";
    statusClass = "bg-amber-50 text-amber-900";
  } else if (record) {
    status = `${deadlinePassed ? "Приём заявок завершён. " : ""}Выгрузка выполнена ${formatDateTime(record.exportedAt)}. Новых изменений нет.`;
    statusClass = "bg-emerald-50 text-emerald-800";
  }

  return (
    <div className={`${compact ? "mt-3" : "mt-4"} grid gap-2`}>
      <p className="flex items-center gap-2 text-sm font-semibold text-slate-600">
        <Clock3 size={15} />
        {group.deadline ? `Приём заявок до ${formatApplicationDeadline(group.deadline)}` : "Дата окончания приёма заявок не указана"}
      </p>
      <p className={`rounded-[8px] px-3 py-2 text-sm font-semibold ${statusClass}`}>{status}</p>
    </div>
  );
}

function isApplicationDeadlinePassed(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return Date.now() > Date.parse(`${value}T23:59:59+04:00`);
}

function formatApplicationDeadline(value: string) {
  const date = new Date(`${value}T00:00:00+04:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Samara" }).format(date);
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
  const store = await getAdminStore({ requireServer: true });
  const patch: Partial<AdminStore> = {};

  const localEventPages = readLocalJson<EventPageDraft[]>("school46.admin.eventPages", []);
  if (!store.eventPages.length && localEventPages.length) patch.eventPages = localEventPages;

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

  if (Object.keys(patch).length) await patchAdminStore(patch, { requireServer: true });
}

function readLocalJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
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
