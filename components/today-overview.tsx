"use client";

import { Card } from "@/components/card";
import { defaultPreferences, preferencesStorageKey } from "@/lib/storage";
import type { EventItem, ScheduleLesson, UserPreferences } from "@/lib/types";
import { CalendarCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const dayNames = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];

export function TodayOverview({ events, lessons }: { events: EventItem[]; lessons: ScheduleLesson[] }) {
  const [prefs, setPrefs] = useState<UserPreferences>(defaultPreferences);
  const today = dayNames[new Date().getDay()];

  useEffect(() => {
    function loadPreferences(event?: Event) {
      const detail = (event as CustomEvent | undefined)?.detail as UserPreferences | undefined;
      if (detail) {
        setPrefs({ ...defaultPreferences, ...detail });
        return;
      }
      const saved = localStorage.getItem(preferencesStorageKey);
      setPrefs(saved ? { ...defaultPreferences, ...JSON.parse(saved) } : defaultPreferences);
    }
    loadPreferences();
    window.addEventListener("school46.preferences-updated", loadPreferences);
    return () => window.removeEventListener("school46.preferences-updated", loadPreferences);
  }, []);

  const todayLessons = useMemo(
    () => lessons
      .filter((lesson) => lesson.day === today)
      .filter((lesson) => prefs.role === "teacher" ? lesson.teacher === prefs.selectedTeacher : lesson.className === prefs.selectedClass)
      .sort((first, second) => first.number - second.number),
    [lessons, prefs.role, prefs.selectedClass, prefs.selectedTeacher, today]
  );

  const todayEvents = useMemo(() => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const classCategories = classCategoriesFromPreferences(prefs);
    const personalEvents = events.filter((event) => classCategories.some((category) => matchesClassCategory(event.classCategory, category)));
    const dated = personalEvents.filter((event) => isEventOnDate(event, todayIso));
    return (dated.length ? dated : upcomingEvents(personalEvents, todayIso)).slice(0, 3);
  }, [events, prefs]);

  const title = prefs.role === "teacher"
    ? `${todayLessons.length} уроков у педагога`
    : `${todayLessons.length} уроков у ${prefs.selectedClass}`;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">Сегодня · {today}</p>
          <h2 className="mt-1 text-xl font-semibold leading-7 text-ink">{title}</h2>
        </div>
        <CalendarCheck className="mt-1 shrink-0 text-apple" size={28} />
      </div>
      <div className="mt-5 grid gap-2">
        {todayLessons.slice(0, 4).map((lesson) => (
          <div key={`${lesson.day}-${lesson.number}-${lesson.className}-${lesson.subject}`} className="grid grid-cols-[108px_1fr] items-center gap-3 rounded-[8px] bg-white px-3 py-2.5">
            <span className="whitespace-nowrap text-sm font-semibold text-apple">{formatLessonTime(lesson)}</span>
            <span className="min-w-0 text-sm leading-5 text-slate-700">
              <span className="block truncate">{lesson.subject}</span>
              <span className="block truncate text-xs text-slate-500">{prefs.role === "teacher" ? lesson.className : lesson.teacher}</span>
            </span>
          </div>
        ))}
        {!todayLessons.length ? <p className="rounded-[8px] bg-white p-3 text-sm text-slate-600">На выбранный профиль уроков на сегодня нет.</p> : null}
        {todayEvents.slice(0, 2).map((event) => (
          <div key={event.id} className="grid grid-cols-[108px_1fr] items-center gap-3 rounded-[8px] bg-white px-3 py-2.5">
            <span className="whitespace-nowrap text-sm font-semibold text-coral">{event.time || event.category}</span>
            <span className="min-w-0 truncate text-sm text-slate-700">{event.title}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function formatLessonTime(lesson: ScheduleLesson) {
  return (lesson.time || `${lesson.number} урок`).replace(/\s*[–-]\s*/g, "-");
}

function classCategoryFromClassName(className: string) {
  const number = Number(className.match(/\d{1,2}/)?.[0] ?? 0);
  if (number >= 1 && number <= 4) return "1-4 классы";
  if (number >= 5 && number <= 8) return "5-8 классы";
  if (number >= 9 && number <= 11) return "9-11 классы";
  return "";
}

function classCategoriesFromPreferences(preferences: UserPreferences) {
  const selectedClasses = preferences.role === "teacher" && preferences.selectedClasses?.length
    ? preferences.selectedClasses
    : [preferences.selectedClass];
  return Array.from(new Set(selectedClasses.map(classCategoryFromClassName).filter(Boolean)));
}

function matchesClassCategory(value: string | undefined, selected: string) {
  if (!selected || !value) return true;
  return splitClassCategories(value).some((item) => {
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

function isEventOnDate(event: EventItem, date: string) {
  const start = event.startDate || event.date;
  const end = event.endDate || start;
  return date >= start && date <= end;
}

function upcomingEvents(events: EventItem[], today: string) {
  return events
    .filter((event) => (event.endDate || event.startDate || event.date) >= today)
    .sort((first, second) => nextEventDate(first, today).localeCompare(nextEventDate(second, today)));
}

function nextEventDate(event: EventItem, today: string) {
  const start = event.startDate || event.date;
  const end = event.endDate || start;
  return start <= today && end >= today ? today : start;
}
