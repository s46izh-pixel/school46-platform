"use client";

import { normalizeClassName, sortClasses } from "@/lib/class-utils";
import { DISTANCE_LEARNING_REVALIDATE_SECONDS } from "@/lib/cache";
import { defaultPreferences, preferencesStorageKey } from "@/lib/storage";
import type { DistanceLearningDay, DistanceLearningLesson, UserPreferences } from "@/lib/types";
import { BookOpenCheck, CalendarDays, ChevronDown, CircleAlert, ExternalLink, History, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type DistanceMode = "saturday" | "temporary";

const distanceModeStorageKey = "school46.distanceMode";
const saturdayClassStorageKey = "school46.distanceClass.saturday";
const temporaryClassStorageKey = "school46.distanceClass.temporary";
const legacyDistanceClassStorageKey = "school46.distanceClass";

export function DistanceLearningView({
  saturdayDays,
  temporaryDays,
  today
}: {
  saturdayDays: DistanceLearningDay[];
  temporaryDays: DistanceLearningDay[];
  today: string;
}) {
  const router = useRouter();
  const saturdayClassOptions = useMemo(() => classesFromDays(saturdayDays), [saturdayDays]);
  const temporaryClassOptions = useMemo(() => classesFromDays(temporaryDays), [temporaryDays]);
  const [mode, setMode] = useState<DistanceMode>("saturday");
  const [selectedClasses, setSelectedClasses] = useState<Record<DistanceMode, string>>({
    saturday: saturdayClassOptions[0] ?? "",
    temporary: temporaryClassOptions[0] ?? ""
  });
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [initialized, setInitialized] = useState(false);
  const [openDates, setOpenDates] = useState<string[]>([]);
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    const refresh = () => router.refresh();
    const timer = window.setInterval(refresh, DISTANCE_LEARNING_REVALIDATE_SECONDS * 1000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [router]);

  useEffect(() => {
    function syncWithProfile() {
      const savedPreferences = localStorage.getItem(preferencesStorageKey);
      let nextPreferences = defaultPreferences;
      try {
        nextPreferences = savedPreferences ? { ...defaultPreferences, ...JSON.parse(savedPreferences) } as UserPreferences : defaultPreferences;
      } catch {
        nextPreferences = defaultPreferences;
      }
      const profileClass = normalizeClassName(nextPreferences.selectedClass);
      const savedMode = localStorage.getItem(distanceModeStorageKey) === "temporary" ? "temporary" : "saturday";
      const legacyClass = normalizeClassName(localStorage.getItem(legacyDistanceClassStorageKey) ?? "");
      const savedSaturdayClass = normalizeClassName(localStorage.getItem(saturdayClassStorageKey) ?? "") || legacyClass;
      const savedTemporaryClass = normalizeClassName(localStorage.getItem(temporaryClassStorageKey) ?? "");
      setPreferences(nextPreferences);
      setMode(savedMode);
      setSelectedClasses((current) => ({
        saturday: nextPreferences.role === "teacher"
          ? pickClass([current.saturday, savedSaturdayClass, profileClass], saturdayClassOptions)
          : profileClass,
        temporary: nextPreferences.role === "teacher"
          ? pickClass([current.temporary, savedTemporaryClass, profileClass], temporaryClassOptions)
          : profileClass
      }));
      setInitialized(true);
    }

    syncWithProfile();
    window.addEventListener("school46.preferences-updated", syncWithProfile);
    return () => window.removeEventListener("school46.preferences-updated", syncWithProfile);
  }, [saturdayClassOptions, temporaryClassOptions]);

  const days = mode === "saturday" ? saturdayDays : temporaryDays;
  const classOptions = mode === "saturday" ? saturdayClassOptions : temporaryClassOptions;
  const className = selectedClasses[mode];
  const isTemporary = mode === "temporary";

  useEffect(() => {
    if (!initialized || preferences.role !== "teacher" || !classOptions.length || classOptions.includes(className)) return;
    setSelectedClasses((current) => ({ ...current, [mode]: classOptions[0] }));
  }, [className, classOptions, initialized, mode, preferences.role]);

  const classDays = useMemo(
    () => days.filter((day) => day.className === className),
    [className, days]
  );
  const upcomingDays = useMemo(() => classDays.filter((day) => day.date >= today), [classDays, today]);
  const pastDays = useMemo(() => classDays.filter((day) => day.date < today).reverse(), [classDays, today]);
  const upcomingDatesKey = upcomingDays.map((day) => day.date).join("|");

  useEffect(() => {
    if (!initialized) return;
    localStorage.setItem(distanceModeStorageKey, mode);
    if (className) localStorage.setItem(mode === "saturday" ? saturdayClassStorageKey : temporaryClassStorageKey, className);
    setOpenDates(upcomingDays[0] ? [upcomingDays[0].date] : []);
    setShowPast(false);
  }, [className, initialized, mode, upcomingDatesKey]);

  function updateClass(value: string) {
    setSelectedClasses((current) => ({ ...current, [mode]: value }));
  }

  function toggleDate(date: string) {
    setOpenDates((current) => current.includes(date) ? current.filter((item) => item !== date) : [...current, date]);
  }

  return (
    <div className="grid min-w-0 gap-4">
      <section className="rounded-[8px] border border-line bg-white p-2">
        <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Вид дистанционного обучения">
          <button
            type="button"
            role="tab"
            aria-selected={!isTemporary}
            onClick={() => setMode("saturday")}
            className={`focus-ring flex min-h-12 items-center justify-center gap-2 rounded-[8px] px-3 py-2 text-sm font-semibold transition ${!isTemporary ? "bg-apple text-white shadow-sm" : "bg-mist text-slate-600 hover:text-ink"}`}
          >
            <CalendarDays size={18} className="shrink-0" />
            <span>Субботний дистант</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isTemporary}
            onClick={() => setMode("temporary")}
            className={`focus-ring flex min-h-12 items-center justify-center gap-2 rounded-[8px] px-3 py-2 text-sm font-semibold transition ${isTemporary ? "bg-amber-500 text-white shadow-sm" : "bg-mist text-slate-600 hover:text-ink"}`}
          >
            <CircleAlert size={18} className="shrink-0" />
            <span>Временный дистант</span>
          </button>
        </div>
      </section>

      {!days.length ? (
        <div className="rounded-[8px] border border-line bg-white p-6 text-slate-600">
          Данные этого раздела временно недоступны. Попробуйте обновить страницу позже.
        </div>
      ) : null}

      {days.length ? <>
      <section className="grid gap-4 rounded-[8px] border border-line bg-white p-4 md:grid-cols-[minmax(220px,320px)_1fr] md:items-end">
        {preferences.role === "teacher" ? (
          <label className="grid gap-2 text-sm font-semibold text-slate-600">
            Класс
            <select
              value={className}
              onChange={(event) => updateClass(event.target.value)}
              className="focus-ring rounded-[8px] border border-line bg-white px-3 py-3 text-base text-ink"
            >
              {classOptions.map((item) => <option key={item} value={item}>{formatClassName(item)}</option>)}
            </select>
          </label>
        ) : (
          <div className="grid gap-2 text-sm font-semibold text-slate-600">
            <span>Ваш класс</span>
            <span className="rounded-[8px] border border-line bg-mist px-3 py-3 text-base text-ink">{formatClassName(className)}</span>
          </div>
        )}
        <div className="min-w-0 rounded-[8px] bg-mist px-4 py-3">
          <p className="text-xs font-semibold uppercase text-slate-500">{isTemporary ? "Ближайший день временного дистанта" : "Ближайшая дистанционная суббота"}</p>
          <p className="mt-1 text-base font-semibold text-ink">
            {upcomingDays[0] ? formatLongDate(upcomingDays[0].date) : isTemporary ? "Активного временного дистанта нет" : "В текущих таблицах новых дат нет"}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {isTemporary
              ? `Показаны дни, когда ${formatClassName(className)} временно переведён на дистанционное обучение.`
              : `Показаны субботы, когда ${formatClassName(className)} занимается дистанционно.`}
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-[8px] border border-line bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">Предстоящие занятия</h2>
            <p className="mt-1 text-sm text-slate-500">{upcomingDays.length ? `${upcomingDays.length} ${dateCountLabel(upcomingDays.length)}` : "Нет предстоящих дат"}</p>
          </div>
          <span className="rounded-[8px] bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">Задания обновляются из таблиц</span>
        </div>
        <div className="divide-y divide-line">
          {upcomingDays.map((day) => (
            <DistanceDay key={`${day.date}-${day.className}`} day={day} open={openDates.includes(day.date)} today={today} onToggle={() => toggleDate(day.date)} />
          ))}
          {!upcomingDays.length ? (
            <p className="px-4 py-6 text-sm text-slate-500">
              {isTemporary ? "Для выбранного класса временный дистант сейчас не назначен." : "Для выбранного класса предстоящих дистанционных дней пока нет."}
            </p>
          ) : null}
        </div>
      </section>

      <section className="overflow-hidden rounded-[8px] border border-line bg-white">
          <button
            type="button"
            onClick={() => setShowPast((current) => !current)}
            className="focus-ring flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
            aria-expanded={showPast}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] bg-slate-100 text-slate-500"><History size={18} /></span>
              <span>
                <span className="block font-semibold text-ink">{isTemporary ? "Архив временного дистанта" : "Прошедшие дистанционные дни"}</span>
                <span className="block text-sm text-slate-500">{pastDays.length} {dateCountLabel(pastDays.length)}</span>
              </span>
            </span>
            <ChevronDown size={20} className={`shrink-0 text-slate-400 transition ${showPast ? "rotate-180" : ""}`} />
          </button>
          {showPast ? (
            <div className="divide-y divide-line border-t border-line">
              {pastDays.map((day) => (
                <DistanceDay key={`${day.date}-${day.className}`} day={day} open={openDates.includes(day.date)} today={today} onToggle={() => toggleDate(day.date)} />
              ))}
              {!pastDays.length ? (
                <p className="px-4 py-6 text-sm text-slate-500">Сохранённых прошедших дней для этого класса пока нет.</p>
              ) : null}
            </div>
          ) : null}
      </section>
      </> : null}
    </div>
  );
}

function DistanceDay({ day, open, today, onToggle }: { day: DistanceLearningDay; open: boolean; today: string; onToggle: () => void }) {
  const assignments = day.lessons.filter(hasAssignment).length;
  return (
    <article>
      <button type="button" onClick={onToggle} className="focus-ring flex w-full flex-wrap items-center justify-between gap-3 px-4 py-4 text-left" aria-expanded={open}>
        <span className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] bg-sky-50 text-apple"><CalendarDays size={19} /></span>
          <span>
            <span className="block font-semibold text-ink">{formatLongDate(day.date)}</span>
            <span className="block text-sm text-slate-500">{day.lessons.length} {lessonCountLabel(day.lessons.length)} · заданий: {assignments}</span>
          </span>
        </span>
        <span className="flex items-center gap-2">
          <span className={`rounded-[8px] px-2.5 py-1 text-xs font-semibold ${day.date === today ? "bg-apple text-white" : day.date < today ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700"}`}>
            {day.date === today ? "Сегодня" : day.date < today ? "Прошло" : "Предстоит"}
          </span>
          <ChevronDown size={20} className={`text-slate-400 transition ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open ? (
        <div className="border-t border-line bg-slate-50/60 px-3 py-3 sm:px-4">
          <div className="overflow-hidden rounded-[8px] border border-line bg-white">
            {day.lessons.map((lesson, index) => <LessonRow key={`${lesson.number}-${lesson.subject}-${index}`} lesson={lesson} />)}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function LessonRow({ lesson }: { lesson: DistanceLearningLesson }) {
  const assigned = hasAssignment(lesson);
  return (
    <div className="grid min-w-0 gap-3 border-b border-line p-3 last:border-b-0 md:grid-cols-[110px_minmax(180px,0.8fr)_minmax(0,1.5fr)] md:gap-4 md:p-4">
      <div>
        <p className="font-semibold text-ink">{lesson.number} урок</p>
        <p className="mt-1 text-xs text-slate-500">{lesson.time || "Время не указано"}</p>
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-ink">{lesson.subject}</p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><UserRound size={14} className="shrink-0" />{lesson.teacher || "Педагог не указан"}</p>
      </div>
      <div className={`min-w-0 rounded-[8px] px-3 py-2.5 ${assigned ? "bg-emerald-50" : "bg-slate-100"}`}>
        <p className={`flex items-center gap-2 text-xs font-semibold uppercase ${assigned ? "text-emerald-700" : "text-slate-500"}`}>
          <BookOpenCheck size={15} />{assigned ? "Задание есть" : "Задания нет"}
        </p>
        {assigned ? <AssignmentContent lesson={lesson} /> : null}
      </div>
    </div>
  );
}

function AssignmentContent({ lesson }: { lesson: DistanceLearningLesson }) {
  const tokens = lesson.assignment.split(/(https?:\/\/[^\s<>()]+)/gi);
  const extraLinks = lesson.links.filter((link) => !lesson.assignment.includes(link.url));
  return (
    <div className="mt-2 min-w-0 text-sm leading-6 text-slate-700">
      {lesson.assignment ? (
        <p className="whitespace-pre-wrap break-words">
          {tokens.map((token, index) => /^https?:\/\//i.test(token) ? (
            <a key={`${token}-${index}`} href={token.replace(/[.,;!?]+$/, "")} target="_blank" rel="noreferrer" className="font-semibold text-apple underline decoration-apple/30 underline-offset-2">
              {token}
            </a>
          ) : <span key={index}>{token}</span>)}
        </p>
      ) : null}
      {extraLinks.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {extraLinks.map((link) => (
            <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="focus-ring inline-flex max-w-full items-center gap-1.5 rounded-[8px] bg-white px-2.5 py-1.5 font-semibold text-apple shadow-sm">
              <ExternalLink size={14} className="shrink-0" /><span className="truncate">{link.label}</span>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function hasAssignment(lesson: DistanceLearningLesson) {
  return Boolean(lesson.assignment.trim() || lesson.links.length);
}

function formatClassName(value: string) {
  return value ? `${value.slice(0, -1)}${value.slice(-1).toUpperCase()}` : "Класс не выбран";
}

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric", weekday: "long", timeZone: "Europe/Samara" }).format(new Date(`${value}T12:00:00+04:00`));
}

function lessonCountLabel(value: number) {
  return value % 10 === 1 && value % 100 !== 11 ? "урок" : value % 10 >= 2 && value % 10 <= 4 && (value % 100 < 10 || value % 100 >= 20) ? "урока" : "уроков";
}

function dateCountLabel(value: number) {
  return value % 10 === 1 && value % 100 !== 11 ? "дата" : value % 10 >= 2 && value % 10 <= 4 && (value % 100 < 10 || value % 100 >= 20) ? "даты" : "дат";
}

function classesFromDays(days: DistanceLearningDay[]) {
  return sortClasses(Array.from(new Set(days.map((day) => day.className))));
}

function pickClass(candidates: string[], options: string[]) {
  return candidates.find((item) => item && options.includes(item)) ?? options[0] ?? "";
}
