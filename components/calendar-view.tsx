"use client";

import { EventItem } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { defaultPreferences, preferencesStorageKey } from "@/lib/storage";
import { getAdminStore } from "@/lib/admin-store-client";
import { CalendarDays, Clock, FileText, ListFilter, MapPin, Users, X } from "lucide-react";
import Link from "next/link";
import { CSSProperties, ReactNode, useEffect, useMemo, useState } from "react";
import { SelectField } from "./selectors";

const viewModes = ["Месяц", "Неделя"];
const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const categoryFilters = ["Все", "Мероприятие", "Акция", "Конкурс", "Линейка", "Олимпиада", "Викторина", "Спорт", "Профориентация", "Безопасность", "Педагогам", "Родителям", "Культура"];
const categoryPalette: Record<string, CSSProperties> = {
  мероприятие: { backgroundColor: "#fef3c7", borderColor: "#fbbf24", color: "#92400e" },
  акция: { backgroundColor: "#ecfdf5", borderColor: "#86efac", color: "#047857" },
  конкурс: { backgroundColor: "#eff6ff", borderColor: "#93c5fd", color: "#1d4ed8" },
  линейка: { backgroundColor: "#f5f3ff", borderColor: "#c4b5fd", color: "#6d28d9" },
  олимпиада: { backgroundColor: "#fff7ed", borderColor: "#fdba74", color: "#c2410c" },
  викторина: { backgroundColor: "#ecfeff", borderColor: "#67e8f9", color: "#0e7490" },
  спорт: { backgroundColor: "#f0fdf4", borderColor: "#4ade80", color: "#166534" },
  профориентация: { backgroundColor: "#eef2ff", borderColor: "#a5b4fc", color: "#4338ca" },
  безопасность: { backgroundColor: "#fef2f2", borderColor: "#fca5a5", color: "#b91c1c" },
  педагогам: { backgroundColor: "#f8fafc", borderColor: "#94a3b8", color: "#334155" },
  родителям: { backgroundColor: "#fdf2f8", borderColor: "#f9a8d4", color: "#be185d" },
  культура: { backgroundColor: "#faf5ff", borderColor: "#d8b4fe", color: "#7e22ce" }
};
const motivationalQuotes = [
  "Попробуй начать с маленького шага - часто именно он меняет весь день.",
  "У тебя получится: спокойно, по порядку, без лишней спешки.",
  "Каждое новое дело становится понятнее, когда делаешь первый шаг.",
  "Сегодня хороший день, чтобы попробовать и стать чуть увереннее.",
  "Ошибки не мешают росту, они показывают, где можно стать сильнее.",
  "Не обязательно делать идеально. Важно сделать внимательно и честно.",
  "Сохраняй темп: маленькие усилия каждый день дают большой результат.",
  "Ты можешь больше, чем кажется в начале. Просто начни.",
  "Знания собираются по крупицам, а потом вдруг складываются в силу.",
  "Пусть сегодня будет одно полезное дело, которым можно гордиться."
];

export function CalendarView({ items, monthlyItems = [] }: { items: EventItem[]; monthlyItems?: EventItem[] }) {
  const [mode, setMode] = useState(viewModes[0]);
  const [classCategoryFilter, setClassCategoryFilter] = useState("Все");
  const [categoryFilter, setCategoryFilter] = useState("Все");
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [profileCategories, setProfileCategories] = useState<string[]>([]);
  const [manualItems, setManualItems] = useState<EventItem[]>([]);
  const [calendarTemplateItems, setCalendarTemplateItems] = useState<EventItem[]>([]);
  const detailItems = useMemo(() => [...manualItems, ...calendarTemplateItems], [calendarTemplateItems, manualItems]);
  const filterOptionItems = useMemo(() => [...items, ...detailItems], [detailItems, items]);
  const classCategoryOptions = useMemo(
    () => Array.from(new Set(filterOptionItems.flatMap((item) => splitClassCategories(item.classCategory)))),
    [filterOptionItems]
  );
  const classFilterOptions = useMemo(
    () => ["Все", ...(profileCategories.length > 1 ? ["Мои классы"] : []), ...classCategoryOptions],
    [classCategoryOptions, profileCategories.length]
  );

  useEffect(() => {
    function syncPreferences(event?: Event) {
      const detail = (event as CustomEvent | undefined)?.detail;
      const saved = localStorage.getItem(preferencesStorageKey);
      const prefs = { ...defaultPreferences, ...(saved ? JSON.parse(saved) : {}), ...(detail || {}) };
      const categories = classCategoriesFromPreferences(prefs);
      setProfileCategories(categories);
      setClassCategoryFilter(categories.length > 1 ? "Мои классы" : categories[0] ?? "Все");
    }
    syncPreferences();
    window.addEventListener("school46.preferences-updated", syncPreferences);
    return () => window.removeEventListener("school46.preferences-updated", syncPreferences);
  }, []);

  useEffect(() => {
    function syncDetailEvents() {
      getAdminStore()
        .then((store) => {
          setManualItems(readManualEventPages(store.eventPages as ManualEventPageDraft[]));
          setCalendarTemplateItems(readPublishedCalendarTemplates(items, store.calendarTemplateVisibility));
        })
        .catch(() => {
          setManualItems([]);
          setCalendarTemplateItems([]);
        });
    }
    syncDetailEvents();
    window.addEventListener("storage", syncDetailEvents);
    window.addEventListener("school46.calendar-templates-updated", syncDetailEvents);
    return () => {
      window.removeEventListener("storage", syncDetailEvents);
      window.removeEventListener("school46.calendar-templates-updated", syncDetailEvents);
    };
  }, [items]);

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const byClassCategory = classCategoryFilter === "Все" || matchesClassCategoryFilter(item.classCategory, classCategoryFilter, profileCategories);
        const byCategory = categoryFilter === "Все" || item.category === categoryFilter;
        return byClassCategory && byCategory;
      }),
    [categoryFilter, classCategoryFilter, items, profileCategories]
  );
  const filteredManualItems = useMemo(
    () =>
      detailItems.filter((item) => {
        const byClassCategory = classCategoryFilter === "Все" || matchesClassCategoryFilter(item.classCategory, classCategoryFilter, profileCategories);
        const byCategory = categoryFilter === "Все" || item.category === categoryFilter;
        return byClassCategory && byCategory;
      }),
    [categoryFilter, classCategoryFilter, detailItems, profileCategories]
  );
  const upcoming = useMemo(() => {
    const today = toDateKey(new Date());
    return filtered
      .filter((item) => (item.endDate || item.startDate || item.date) >= today)
      .sort((first, second) => nextEventDate(first, today).localeCompare(nextEventDate(second, today)))
      .slice(0, 3);
  }, [filtered]);
  const upcomingIds = useMemo(() => new Set(upcoming.map((item) => item.id)), [upcoming]);
  const currentDate = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", weekday: "long" }).format(new Date());
  const quoteOfTheDay = useMemo(() => motivationalQuotes[dayOfYear(new Date()) % motivationalQuotes.length], []);
  const calendarDays = useMemo(() => buildMonthGrid(filtered), [filtered]);
  const calendarTitle = useMemo(() => formatCalendarTitle(calendarDays), [calendarDays]);

  return (
    <div className="grid gap-5">
      <section className="grid gap-5 rounded-[8px] border border-line bg-white p-4 shadow-sm xl:grid-cols-[minmax(0,1fr)_420px]">
        <div>
          <p className="text-sm font-semibold text-apple">Сегодня</p>
          <h2 className="mt-1 text-3xl font-semibold capitalize text-ink">{currentDate}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Календарь обновляется по актуальному плану школьных мероприятий.</p>
          <div className="mt-6 max-w-2xl rounded-[8px] border border-sky-100 bg-sky-50 px-4 py-3 text-sm leading-6 text-slate-700">
            <span className="block text-xs font-semibold uppercase text-apple">Мысль дня</span>
            <span className="mt-1 block">{quoteOfTheDay}</span>
          </div>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-ink">Ближайшие события</h3>
          <div className="grid gap-2">
            {upcoming.length ? upcoming.map((item) => {
              const upcomingClassName = `grid grid-cols-[92px_1fr] gap-3 rounded-[8px] border px-3 py-2 text-left text-sm shadow-sm ring-1 ring-apple/25 transition hover:bg-white hover:shadow-sm ${eventTypeClass(item.type)}`;
              const upcomingContent = (
                <>
                <span className="whitespace-nowrap font-semibold text-apple">{formatDate(item.date)}</span>
                <span className="min-w-0">
                  <span className="block break-words font-semibold text-ink">{item.title}</span>
                  <span className="block break-words text-xs text-slate-500">{[item.time, item.place].filter(Boolean).join(" · ")}</span>
                </span>
                </>
              );
              return isManualEvent(item) ? (
                <button key={item.id} onClick={() => setSelectedEvent(item)} className={upcomingClassName} style={eventColorStyle(item)}>
                  {upcomingContent}
                </button>
              ) : (
                <a key={item.id} href={`/events/${item.slug}`} className={upcomingClassName} style={eventColorStyle(item)}>
                  {upcomingContent}
                </a>
              );
            }) : <p className="rounded-[8px] bg-mist px-3 py-2 text-sm text-slate-500">Ближайшие события пока не указаны.</p>}
          </div>
        </div>
        <div className="grid gap-3 rounded-[8px] border border-line bg-mist p-3 lg:grid-cols-[minmax(0,1fr)_260px] xl:col-span-2">
          <div>
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink"><ListFilter size={17} /> Фильтры</p>
            <div className="mb-3 flex flex-wrap gap-2">
              {categoryFilters.map((item) => (
                <button key={item} onClick={() => setCategoryFilter(item)} className={`rounded-[8px] px-3 py-2 text-sm font-semibold ${categoryFilter === item ? "bg-ink text-white" : "bg-white text-slate-600"}`}>
                  {item}
                </button>
              ))}
            </div>
            <div className="max-w-sm">
              <SelectField label="Класс" value={classCategoryFilter} options={classFilterOptions} onChange={setClassCategoryFilter} />
            </div>
          </div>
          <div className="rounded-[8px] border border-white bg-white p-3 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">Показано</p>
            <p className="mt-1 text-3xl font-semibold text-ink">{filtered.length}</p>
            <p className="text-sm text-slate-500">{eventCountLabel(filtered.length)}</p>
            <div className="mt-3 grid gap-2 text-sm">
              <div className="rounded-[8px] bg-mist px-3 py-2">
                <span className="block text-xs font-semibold text-slate-500">Класс</span>
                <span className="font-semibold text-ink">{classCategoryFilter}</span>
              </div>
              <div className="rounded-[8px] bg-mist px-3 py-2">
                <span className="block text-xs font-semibold text-slate-500">Категория</span>
                <span className="font-semibold text-ink">{categoryFilter}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="rounded-[8px] border border-line bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="text-apple" />
            <h3 className="text-xl font-semibold">{calendarTitle}</h3>
          </div>
          <div className="flex rounded-[8px] bg-mist p-1">
            {viewModes.map((item) => (
              <button key={item} onClick={() => setMode(item)} className={`rounded-[8px] px-3 py-2 text-sm font-semibold ${mode === item ? "bg-white text-ink shadow-sm" : "text-slate-500"}`}>
                {item}
              </button>
            ))}
          </div>
        </div>
        {mode === "Месяц" ? <MonthGrid days={calendarDays} highlightedIds={upcomingIds} onSelectEvent={setSelectedEvent} /> : <EventList items={filtered} highlightedIds={upcomingIds} onSelectEvent={setSelectedEvent} />}
      </div>
      {monthlyItems.length ? (
        <section className="rounded-[8px] border border-line bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-2xl font-semibold text-ink">В течение месяца</h3>
          <div className="grid gap-2 md:grid-cols-2">
            {monthlyItems.map((item) => (
              <div key={item.id} className="rounded-[8px] bg-mist px-3 py-2 text-sm">
                <span className="font-semibold text-ink">{item.title}</span>
                <span className="mt-1 block text-xs text-slate-500">{item.time}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      <section className="rounded-[8px] border border-line bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-apple">Материалы</p>
            <h3 className="text-2xl font-semibold text-ink">Афиша подробностей</h3>
          </div>
          <span className="rounded-[8px] bg-mist px-3 py-2 text-sm font-semibold text-slate-500">{filteredManualItems.length} доступно</span>
        </div>
        {filteredManualItems.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredManualItems.map((item) => (
            <article key={item.id} className="overflow-hidden rounded-[8px] border border-line bg-white shadow-sm">
              <Link href={isManualEvent(item) ? `/events/manual/${item.slug}` : `/events/${item.slug}`} className="block">
                {item.cover ? (
                  <div className="aspect-square overflow-hidden bg-mist">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.cover} alt="" className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]" />
                  </div>
                ) : (
                  <div className="grid aspect-square place-items-center bg-mist text-apple">
                    <FileText size={42} />
                  </div>
                )}
              </Link>
              <div className="grid gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-apple">{formatDate(item.date)}</p>
                  <span className="rounded-[8px] px-2 py-1 text-xs font-semibold" style={eventColorStyle(item)}>{item.category}</span>
                </div>
                <div>
                  <h4 className="text-lg font-semibold leading-6 text-ink">{item.title}</h4>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{[item.time, item.place, item.participants].filter(Boolean).join(" · ")}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={isManualEvent(item) ? `/events/manual/${item.slug}` : `/events/${item.slug}`} className="rounded-[8px] bg-ink px-3 py-2 text-sm font-semibold text-white">Открыть страницу</Link>
                </div>
              </div>
            </article>
          ))}
          </div>
        ) : (
          <p className="rounded-[8px] bg-mist px-4 py-3 text-sm text-slate-500">Пока нет вручную созданных страниц мероприятий. Создайте событие в админке, и оно появится здесь.</p>
        )}
      </section>
      {selectedEvent ? <EventDetailsModal item={selectedEvent} onClose={() => setSelectedEvent(null)} /> : null}
    </div>
  );
}

function MonthGrid({ days, highlightedIds, onSelectEvent }: { days: CalendarDay[]; highlightedIds: Set<string>; onSelectEvent: (item: EventItem) => void }) {
  return (
    <div className="overflow-hidden rounded-[8px] border border-line">
      <div className="grid grid-cols-7 bg-mist">
        {weekDays.map((day) => (
          <div key={day} className="border-r border-line px-2 py-2 text-center text-xs font-semibold uppercase text-slate-500 last:border-r-0">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 bg-white">
        {days.map((day) => (
          <div key={day.key} className={`min-h-[118px] border-r border-t border-line p-1.5 last:border-r-0 ${day.inMonth ? "bg-white" : "bg-mist/60"}`}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className={`grid h-7 w-7 place-items-center rounded-[8px] text-sm font-semibold ${day.isToday ? "bg-ink text-white" : day.inMonth ? "text-ink" : "text-slate-400"}`}>
                {day.date.getDate()}
              </span>
              {day.events.length ? <span className="h-2 w-2 rounded-full bg-apple" /> : null}
            </div>
            <div className="grid gap-1">
              {sortCalendarEvents(day.events).map((event) => {
                const range = eventRangeLabel(event, day.date);
                return (
                <button
                  key={event.id}
                  onClick={() => onSelectEvent(event)}
                  className={`grid gap-0.5 rounded-[8px] px-1.5 py-1 text-left text-[10px] font-semibold leading-3 shadow-sm transition hover:brightness-95 ${eventTypeClass(event.type)} ${highlightedIds.has(event.id) ? "ring-2 ring-apple/45 ring-offset-1" : ""}`}
                  style={eventColorStyle(event)}
                >
                  <span className={`w-fit max-w-full rounded px-1 py-0.5 text-[7px] uppercase leading-3 tracking-normal ${eventRangeClass(range.state)}`}>{range.label}</span>
                  <span className="break-words">{event.title}</span>
                </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EventList({ items, highlightedIds, onSelectEvent }: { items: EventItem[]; highlightedIds: Set<string>; onSelectEvent: (item: EventItem) => void }) {
  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelectEvent(item)}
          className={`grid gap-2 rounded-[8px] border px-3 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm md:grid-cols-[182px_minmax(150px,1fr)_minmax(120px,170px)] md:items-start ${eventTypeClass(item.type)} ${highlightedIds.has(item.id) ? "ring-2 ring-apple/35 ring-offset-1" : ""}`}
          style={eventColorStyle(item)}
        >
          <span className="w-full max-w-full whitespace-nowrap rounded-[8px] bg-white px-2.5 py-1 text-center text-sm font-semibold leading-5 text-apple">
            {formatEventRange(item)}
          </span>
          <span className="min-w-0">
            <span className="block break-words text-sm font-semibold leading-5 text-ink">{item.title}</span>
            <span className="mt-1 block break-words text-xs leading-5 text-slate-500">{item.participants}</span>
          </span>
          <span className="min-w-0 break-words text-xs leading-5 text-slate-500 md:text-right">
            {[item.time, item.place].filter(Boolean).join(" · ") || typeLabel(item.type)}
          </span>
        </button>
      ))}
    </div>
  );
}

function EventDetailsModal({ item, onClose }: { item: EventItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[110] grid place-items-center bg-slate-950/35 px-4 backdrop-blur-sm" onClick={onClose}>
      <section className="w-full max-w-xl rounded-[8px] border border-line bg-white p-5 shadow-soft" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-apple">{item.category}</p>
            <h2 className="mt-1 text-2xl font-semibold leading-8 text-ink">{item.title}</h2>
          </div>
          <button onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] bg-mist text-ink" aria-label="Закрыть">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-2 text-sm">
          <DetailRow icon={<CalendarDays size={17} />} label="Дата начала мероприятия" value={formatDate(item.startDate || item.date)} />
          <DetailRow icon={<CalendarDays size={17} />} label="Дата окончания мероприятия" value={item.endDate ? formatDate(item.endDate) : "Совпадает с датой начала"} />
          <DetailRow icon={<Clock size={17} />} label="Время" value={item.time || "Время уточняется"} />
          <DetailRow icon={<MapPin size={17} />} label="Место" value={item.place || "Место уточняется"} />
          <DetailRow icon={<Users size={17} />} label="Классы" value={item.participants || "Все классы"} />
          {item.classCategory ? <DetailRow icon={<ListFilter size={17} />} label="Категория классов" value={item.classCategory} /> : null}
          {item.description ? <DetailRow icon={<ListFilter size={17} />} label="Дополнительная информация" value={item.description} /> : null}
        </div>

      </section>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="grid grid-cols-[24px_170px_1fr] items-start gap-2 rounded-[8px] bg-mist px-3 py-2">
      <span className="text-apple">{icon}</span>
      <span className="font-semibold text-slate-500">{label}</span>
      <span className="whitespace-pre-line text-ink">{value}</span>
    </div>
  );
}

type CalendarDay = {
  key: string;
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  events: EventItem[];
};

function buildMonthGrid(items: EventItem[]): CalendarDay[] {
  const base = getCalendarBaseDate(items);
  const firstDay = new Date(base.getFullYear(), base.getMonth(), 1);
  const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - startOffset);
  const totalCells = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7;
  const todayIso = toDateKey(new Date());

  return Array.from({ length: totalCells }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      key: toDateKey(date),
      date,
      inMonth: date.getMonth() === base.getMonth(),
      isToday: toDateKey(date) === todayIso,
      events: items.filter((item) => isEventOnDate(item, date))
    };
  });
}

function getCalendarBaseDate(items: EventItem[]) {
  const today = new Date();
  const upcoming = items.find((item) => item.date >= toDateKey(today));
  const source = upcoming?.date || items[0]?.date;
  const parsed = source ? new Date(source) : today;
  return Number.isNaN(parsed.getTime()) ? today : parsed;
}

function formatCalendarTitle(days: CalendarDay[]) {
  const current = days.find((day) => day.inMonth)?.date ?? new Date();
  return new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(current);
}

function isEventOnDate(item: EventItem, date: Date) {
  const current = toDateKey(date);
  const start = item.startDate || item.date;
  const end = item.endDate || start;
  return current >= start && current <= end;
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function nextEventDate(item: EventItem, today: string) {
  const start = item.startDate || item.date;
  const end = item.endDate || start;
  if (start <= today && end >= today) return today;
  return start;
}

function eventCountLabel(count: number) {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return "событий в выборке";
  if (last === 1) return "событие в выборке";
  if (last >= 2 && last <= 4) return "события в выборке";
  return "событий в выборке";
}

function dayOfYear(date: Date) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86400000);
}

function matchesClassCategoryFilter(value: string | undefined, selected: string, profileCategories: string[]) {
  if (selected === "Мои классы") {
    return profileCategories.some((category) => matchesClassCategory(value, category));
  }
  return matchesClassCategory(value, selected);
}

function matchesClassCategory(value: string | undefined, selected: string) {
  const categories = splitClassCategories(value);
  return categories.some((item) => {
    const normalized = item.toLowerCase();
    return normalized === selected.toLowerCase() || normalized.includes("все") || classCategoryFromClassName(item) === selected;
  });
}

function splitClassCategories(value: string | undefined) {
  return (value || "")
    .split(/[,;|/\\\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function classCategoriesFromPreferences(preferences: { role?: string; selectedClass?: string; selectedClasses?: string[] }) {
  const selectedClasses = preferences.role === "teacher" && preferences.selectedClasses?.length
    ? preferences.selectedClasses
    : [preferences.selectedClass || ""];
  return Array.from(new Set(selectedClasses.map(classCategoryFromClassName).filter(Boolean)));
}

function classCategoryFromClassName(className: string) {
  const number = Number(className.match(/\d{1,2}/)?.[0] ?? 0);
  if (number >= 1 && number <= 4) return "1-4 классы";
  if (number >= 5 && number <= 8) return "5-8 классы";
  if (number >= 9 && number <= 11) return "9-11 классы";
  return "";
}

function sortCalendarEvents(events: EventItem[]) {
  return [...events].sort((first, second) => {
    const typeOrder = eventTypeOrder(first.type) - eventTypeOrder(second.type);
    if (typeOrder !== 0) return typeOrder;
    return first.title.localeCompare(second.title, "ru");
  });
}

function eventTypeOrder(type: EventItem["type"]) {
  if (type === "event") return 0;
  if (type === "action") return 1;
  return 2;
}

function eventRangeLabel(item: EventItem, date: Date) {
  const current = toDateKey(date);
  if (item.endDate && item.startDate !== item.endDate) {
    if (current === item.startDate) return { state: "старт", label: "старт", caption: `начало: ${formatDate(item.startDate)} · конец: ${formatDate(item.endDate)}` };
    if (current === item.endDate) return { state: "финиш", label: "финиш", caption: `начало: ${formatDate(item.startDate)} · конец: ${formatDate(item.endDate)}` };
    return { state: "идёт", label: "идёт", caption: `начало: ${formatDate(item.startDate)} · конец: ${formatDate(item.endDate)}` };
  }
  return { state: "в этот день", label: "в этот день", caption: `дата: ${formatDate(item.startDate || item.date)}` };
}

function eventRangeClass(label: string) {
  if (label === "старт") return "bg-emerald-600 text-white";
  if (label === "финиш") return "bg-coral text-white";
  if (label === "идёт") return "bg-white/75 text-slate-700";
  return "bg-white/75 text-slate-700";
}

function formatEventRange(item: EventItem) {
  if (item.endDate && item.endDate !== item.startDate) return `${formatDate(item.startDate)} - ${formatDate(item.endDate)}`;
  return formatDate(item.date);
}

function eventTypeClass(type: EventItem["type"]) {
  return type ? "border" : "";
}

function eventColorStyle(item: EventItem): CSSProperties {
  return categoryPalette[item.category.trim().toLowerCase()] ?? categoryPalette.мероприятие;
}

function typeLabel(type: EventItem["type"]) {
  if (type === "contest") return "Конкурс";
  if (type === "action") return "Акция";
  return "Мероприятие";
}

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
  acceptApplications?: boolean;
  deadline?: string;
  applicationFields?: string;
  applicationButton?: string;
  published?: boolean;
  autoHideDate?: string;
};

function readManualEventPages(drafts: ManualEventPageDraft[]): EventItem[] {
  if (!Array.isArray(drafts)) return [];
  return drafts
    .filter((item) => (item.title || item.slug) && item.published !== false && !isManualAutoHidden(item.autoHideDate))
    .map((item, index) => manualDraftToEvent(item, index));
}

function readPublishedCalendarTemplates(items: EventItem[], visibility: Record<string, boolean>) {
  return items.filter((item) => visibility[item.slug] === true);
}

function isManualAutoHidden(value: string | undefined) {
  const date = validDateKey(value);
  if (!date) return false;
  return date < toDateKey(new Date());
}

function manualDraftToEvent(item: ManualEventPageDraft, index: number): EventItem {
  const date = validDateKey(item.startDate) || toDateKey(new Date());
  const endDate = validDateKey(item.endDate);
  const category = item.category || "Мероприятие";
  const slug = item.slug || `manual-event-${index + 1}`;

  return {
    id: `manual-${slug}`,
    date,
    startDate: date,
    endDate: endDate || undefined,
    time: item.time || "",
    title: item.title || "Новое мероприятие",
    type: eventTypeFromCategory(category),
    category,
    classCategory: item.classes || "Все классы",
    place: item.place || "",
    description: item.description || "",
    participants: item.classes || "Все классы",
    owner: item.owner || "Школа №46",
    status: normalizeManualStatus(item.status),
    cover: item.cover || "/images/school-hero.jpg",
    tags: [category],
    acceptApplications: Boolean(item.acceptApplications),
    applicationDeadline: validDateKey(item.deadline) || undefined,
    applicationFields: splitManualFields(item.applicationFields),
    applicationButtonText: item.applicationButton || "Подать заявку",
    slug
  };
}

function eventTypeFromCategory(category: string): EventItem["type"] {
  const normalized = category.toLowerCase();
  if (normalized.includes("конкурс") || normalized.includes("олимпиада") || normalized.includes("викторина")) return "contest";
  if (normalized.includes("акция")) return "action";
  return "event";
}

function normalizeManualStatus(status: string | undefined): EventItem["status"] {
  if (status === "active" || status === "finished" || status === "planned") return status;
  return "planned";
}

function splitManualFields(value: string | undefined) {
  return (value || "ФИО участника, класс, педагог, контакт")
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function validDateKey(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  return value;
}

function isManualEvent(item: EventItem) {
  return item.id.startsWith("manual-");
}
