"use client";

import { Card } from "@/components/card";
import { defaultPreferences, preferencesStorageKey } from "@/lib/storage";
import type { EventItem, ScheduleChange, ScheduleLesson, UserPreferences } from "@/lib/types";
import { CalendarCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const dayNames = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
type ScheduleDisplayItem = ScheduleLesson | ScheduleChange;
type LessonState = ReturnType<typeof getLessonState>;

export function TodayOverview({ events, lessons, changes }: { events: EventItem[]; lessons: ScheduleLesson[]; changes: ScheduleChange[] }) {
  const [prefs, setPrefs] = useState<UserPreferences>(defaultPreferences);
  const [now, setNow] = useState(() => new Date());
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

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const changedTodayLessons = useMemo(
    () => changes
      .filter((lesson) => lesson.day === today)
      .filter((lesson) => prefs.role === "teacher" ? lesson.teacher === prefs.selectedTeacher : lesson.className === prefs.selectedClass)
      .sort((first, second) => first.number - second.number || first.className.localeCompare(second.className, "ru", { numeric: true })),
    [changes, prefs.role, prefs.selectedClass, prefs.selectedTeacher, today]
  );
  const overrideChanges = useMemo(
    () => changes
      .filter((lesson) => lesson.day === today)
      .filter((lesson) => prefs.role === "teacher" ? Boolean(lesson.className) : lesson.className === prefs.selectedClass),
    [changes, prefs.role, prefs.selectedClass, today]
  );
  const regularTodayLessons = useMemo(
    () => lessons
      .filter((lesson) => lesson.day === today)
      .filter((lesson) => prefs.role === "teacher" ? lesson.teacher === prefs.selectedTeacher : lesson.className === prefs.selectedClass)
      .sort((first, second) => first.number - second.number || first.className.localeCompare(second.className, "ru", { numeric: true })),
    [lessons, prefs.role, prefs.selectedClass, prefs.selectedTeacher, today]
  );
  const todayLessons = useMemo(
    () => mergeLessonsWithChanges(regularTodayLessons, changedTodayLessons, overrideChanges),
    [changedTodayLessons, overrideChanges, regularTodayLessons]
  );
  const lessonStates = useMemo(() => todayLessons.map((lesson) => ({ lesson, state: getLessonState(lesson, now) })), [now, todayLessons]);
  const remainingLessonsCount = lessonStates.filter(({ state }) => state.kind !== "past").length;
  const visibleLessonStates = prefs.role === "teacher"
    ? lessonStates.filter(({ state }) => state.kind !== "past").slice(0, 5)
    : lessonStates;
  const timerText = getLessonTimerText(lessonStates, now);

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
  const progressText = todayLessons.length
    ? remainingLessonsCount
      ? `Осталось ${remainingLessonsCount} из ${todayLessons.length}`
      : "Учебный день завершен"
    : "";

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">Сегодня · {today}</p>
          <h2 className="mt-1 text-xl font-semibold leading-7 text-ink">{title}</h2>
          {progressText ? <p className="mt-1 text-sm font-semibold text-slate-500">{progressText}</p> : null}
        </div>
        <div className="ml-auto hidden min-w-[150px] rounded-[8px] bg-white px-3 py-2 text-right shadow-sm sm:block">
          <p className="text-[11px] font-semibold uppercase text-slate-400">Таймер</p>
          <p className="mt-1 text-sm font-semibold text-ink">{timerText}</p>
        </div>
        <CalendarCheck className="mt-1 shrink-0 text-apple" size={28} />
      </div>
      <div className="mt-5 grid gap-2">
        {visibleLessonStates.map(({ lesson, state }) => (
          <div key={`${lesson.day}-${lesson.number}-${lesson.className}-${lesson.subject}`} className="grid grid-cols-[108px_1fr] items-center gap-3 rounded-[8px] bg-white px-3 py-2.5">
            <span className="grid gap-1">
              <span className={`whitespace-nowrap text-sm font-semibold ${state.timeClass}`}>{formatLessonTime(lesson)}</span>
              <span className={`w-fit rounded-[8px] px-1.5 py-0.5 text-[10px] font-semibold leading-4 ${state.badgeClass}`}>{state.label}</span>
            </span>
            <span className="min-w-0 text-sm leading-5 text-slate-700">
              <span className="block truncate">{lesson.subject}</span>
              <span className="block truncate text-xs text-slate-500">{prefs.role === "teacher" ? [lesson.className, lesson.teacher].filter(Boolean).join(" · ") : lesson.teacher}</span>
            </span>
          </div>
        ))}
        {todayLessons.length && !visibleLessonStates.length ? <p className="rounded-[8px] bg-white p-3 text-sm text-slate-600">На сегодня уроки уже завершены.</p> : null}
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

function formatLessonTime(lesson: ScheduleLesson | ScheduleChange) {
  return (lesson.time || `${lesson.number} урок`).replace(/\s*[–-]\s*/g, "-");
}

function getLessonState(lesson: ScheduleDisplayItem, now: Date) {
  const range = parseTimeRange(lesson.time);
  if (!range) {
    return {
      kind: "future",
      label: "В расписании",
      timeClass: isScheduleChange(lesson) ? "text-coral" : "text-apple",
      badgeClass: "bg-mist text-slate-600"
    };
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  if (currentMinutes > range.end) {
    return { kind: "past", label: "Уже прошел", timeClass: "text-slate-400", badgeClass: "bg-slate-100 text-slate-500" };
  }
  if (currentMinutes >= range.start && currentMinutes <= range.end) {
    return { kind: "current", label: "Сейчас идет", timeClass: "text-coral", badgeClass: "bg-rose-50 text-coral" };
  }
  if (range.start - currentMinutes <= 15) {
    return { kind: "soon", label: "Скоро начнется", timeClass: "text-apple", badgeClass: "bg-[var(--accent-soft)] text-apple" };
  }
  return { kind: "future", label: "Впереди", timeClass: isScheduleChange(lesson) ? "text-coral" : "text-apple", badgeClass: "bg-mist text-slate-600" };
}

function getLessonTimerText(lessonStates: Array<{ lesson: ScheduleDisplayItem; state: LessonState }>, now: Date) {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentLesson = lessonStates.find(({ state }) => state.kind === "current");
  if (currentLesson) {
    const range = parseTimeRange(currentLesson.lesson.time);
    return range ? `до конца ${formatMinutesLeft(range.end - currentMinutes)}` : "урок идет";
  }

  const nextLesson = lessonStates.find(({ state }) => state.kind === "soon" || state.kind === "future");
  if (nextLesson) {
    const range = parseTimeRange(nextLesson.lesson.time);
    return range ? `до начала ${formatMinutesLeft(range.start - currentMinutes)}` : "скоро урок";
  }

  return lessonStates.length ? "день завершен" : "уроков нет";
}

function formatMinutesLeft(minutes: number) {
  const safeMinutes = Math.max(0, minutes);
  if (safeMinutes < 60) return `${safeMinutes} мин`;
  const hours = Math.floor(safeMinutes / 60);
  const rest = safeMinutes % 60;
  return rest ? `${hours} ч ${rest} мин` : `${hours} ч`;
}

function parseTimeRange(time?: string) {
  const match = (time || "").match(/(\d{1,2})[.:](\d{2})\s*[–-]\s*(\d{1,2})[.:](\d{2})/);
  if (!match) return null;
  const [, startHour, startMinute, endHour, endMinute] = match;
  return {
    start: Number(startHour) * 60 + Number(startMinute),
    end: Number(endHour) * 60 + Number(endMinute)
  };
}

function mergeLessonsWithChanges(regularLessons: ScheduleLesson[], changedLessons: ScheduleChange[], overrideChanges: ScheduleChange[]) {
  const overriddenClassDays = new Set(overrideChanges.map(changeClassDayKey));
  return [
    ...changedLessons,
    ...regularLessons.filter((lesson) => !overriddenClassDays.has(lessonClassDayKey(lesson)))
  ].sort((first, second) => first.number - second.number || first.className.localeCompare(second.className, "ru", { numeric: true }));
}

function lessonClassDayKey(lesson: ScheduleLesson) {
  return `${lesson.day}|${lesson.className}`;
}

function changeClassDayKey(change: ScheduleChange) {
  return `${change.day}|${change.className}`;
}

function isScheduleChange(lesson: ScheduleLesson | ScheduleChange): lesson is ScheduleChange {
  return "note" in lesson;
}

function classCategoryFromClassName(className: string) {
  const number = Number(className.match(/\d{1,2}/)?.[0] ?? 0);
  if (number >= 1 && number <= 4) return "1-4 классы";
  if (number >= 5 && number <= 8) return "5-8 классы";
  if (number >= 9 && number <= 11) return "9-11 классы";
  return "";
}

function classCategoriesFromPreferences(preferences: UserPreferences) {
  return Array.from(new Set(selectedClassesFromPreferences(preferences).map(classCategoryFromClassName).filter(Boolean)));
}

function selectedClassesFromPreferences(preferences: UserPreferences) {
  const selectedClasses = preferences.role === "teacher" && preferences.selectedClasses?.length
    ? preferences.selectedClasses
    : [preferences.selectedClass];
  return Array.from(new Set(selectedClasses.filter(Boolean)));
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
