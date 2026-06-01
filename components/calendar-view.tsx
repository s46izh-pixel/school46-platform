"use client";

import { categories, classes } from "@/lib/mock-data";
import { EventItem } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { CalendarDays, ListFilter } from "lucide-react";
import { useMemo, useState } from "react";
import { EventCard } from "./event-card";
import { SelectField } from "./selectors";

const viewModes = ["Месяц", "Неделя"];
const typeFilters = [
  { value: "all", label: "Все" },
  { value: "event", label: "Мероприятия" },
  { value: "contest", label: "Конкурсы" },
  { value: "action", label: "Акции" }
];

export function CalendarView({ items }: { items: EventItem[] }) {
  const [mode, setMode] = useState(viewModes[0]);
  const [classFilter, setClassFilter] = useState("Все");
  const [categoryFilter, setCategoryFilter] = useState("Все");
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const byClass = classFilter === "Все" || item.participants.includes(classFilter) || item.participants.includes("Все");
        const byCategory = categoryFilter === "Все" || item.category === categoryFilter;
        const byType = typeFilter === "all" || item.type === typeFilter;
        return byClass && byCategory && byType;
      }),
    [categoryFilter, classFilter, items, typeFilter]
  );

  return (
    <div className="grid gap-5">
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="rounded-[8px] border border-line bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="text-apple" />
              <h3 className="text-xl font-semibold">Календарь: {mode.toLowerCase()}</h3>
            </div>
            <div className="flex rounded-[8px] bg-mist p-1">
              {viewModes.map((item) => (
                <button key={item} onClick={() => setMode(item)} className={`rounded-[8px] px-3 py-2 text-sm font-semibold ${mode === item ? "bg-white text-ink shadow-sm" : "text-slate-500"}`}>
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className={mode === "Месяц" ? "grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7" : "grid gap-2"}>
            {filtered.map((item) => (
              <a key={item.id} href={`/events/${item.slug}`} className="rounded-[8px] border border-line bg-mist p-3 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm">
                <span className="text-xs font-semibold text-apple">{formatDate(item.date)}</span>
                <span className="mt-2 block text-sm font-semibold text-ink">{item.title}</span>
                <span className="mt-1 block text-xs text-slate-500">{item.time} · {item.place}</span>
              </a>
            ))}
          </div>
        </div>
        <aside className="grid gap-4">
          <div className="rounded-[8px] border border-line bg-white p-4 shadow-sm">
            <p className="mb-3 flex items-center gap-2 font-semibold text-ink"><ListFilter size={18} /> Фильтры</p>
            <div className="mb-3 flex flex-wrap gap-2">
              {typeFilters.map((item) => (
                <button key={item.value} onClick={() => setTypeFilter(item.value)} className={`rounded-[8px] px-3 py-2 text-sm font-semibold ${typeFilter === item.value ? "bg-ink text-white" : "bg-mist text-slate-600"}`}>
                  {item.label}
                </button>
              ))}
            </div>
            <div className="grid gap-3">
              <SelectField label="Класс" value={classFilter} options={["Все", ...classes]} onChange={setClassFilter} />
              <SelectField label="Категория" value={categoryFilter} options={["Все", ...categories.map((item) => item.title)]} onChange={setCategoryFilter} />
            </div>
          </div>
          {filtered.slice(0, 2).map((item) => <EventCard key={item.id} item={item} />)}
        </aside>
      </div>
      <section>
        <h3 className="mb-4 text-2xl font-semibold text-ink">Список событий</h3>
        <div className="grid gap-5 md:grid-cols-3">
          {filtered.map((item) => <EventCard key={item.id} item={item} />)}
        </div>
      </section>
    </div>
  );
}
