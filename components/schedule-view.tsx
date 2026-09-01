"use client";

import { classes, teacherNames } from "@/lib/mock-data";
import { preferencesStorageKey, defaultPreferences } from "@/lib/storage";
import { uniqueClasses } from "@/lib/class-utils";
import { BellSchedule, ScheduleChange, ScheduleLesson, UserPreferences } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
import { SelectField } from "./selectors";

type ScheduleDisplayItem = ScheduleLesson | ScheduleChange;

const dayOrder = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
const bellGroups: Array<{ title: string; dayGroup: BellSchedule["dayGroup"]; shift: BellSchedule["shift"] }> = [
  { title: "Понедельник · 1 смена", dayGroup: "monday", shift: 1 },
  { title: "Понедельник · 2 смена", dayGroup: "monday", shift: 2 },
  { title: "Вторник-суббота · 1 смена", dayGroup: "regular", shift: 1 },
  { title: "Вторник-суббота · 2 смена", dayGroup: "regular", shift: 2 }
];
const classGroupButtons = ["1-4 классы", "5-8 классы", "9-11 классы", "Все классы"];

export function ScheduleView({ lessons, bells, changes }: { lessons: ScheduleLesson[]; bells: BellSchedule[]; changes: ScheduleChange[] }) {
  const classOptions = useMemo(() => uniqueClasses(lessons.map((lesson) => lesson.className), classes), [lessons]);
  const teacherOptions = useMemo(() => uniqueValues(lessons.map((lesson) => lesson.teacher), teacherNames), [lessons]);
  const [className, setClassName] = useState(classOptions[0]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([classOptions[0]]);
  const [teacher, setTeacher] = useState(teacherOptions[0]);
  const [role, setRole] = useState<UserPreferences["role"]>(defaultPreferences.role);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const savedClass = localStorage.getItem("school46.class");
    const savedTeacher = localStorage.getItem("school46.teacher");
    const savedPreferences = localStorage.getItem(preferencesStorageKey);
    const parsedPreferences = savedPreferences ? { ...defaultPreferences, ...JSON.parse(savedPreferences) } : defaultPreferences;
    const preferredClass = savedClass ?? parsedPreferences.selectedClass;
    const safeClass = preferredClass && classOptions.includes(preferredClass) ? preferredClass : classOptions[0];
    const safeClasses = normalizeSelectedClasses(parsedPreferences.selectedClasses, safeClass, classOptions);
    setClassName(safeClasses[0] ?? safeClass);
    setSelectedClasses(parsedPreferences.role === "teacher" ? safeClasses : [safeClasses[0] ?? safeClass]);
    setTeacher((savedTeacher ?? parsedPreferences.selectedTeacher) && teacherOptions.includes(savedTeacher ?? parsedPreferences.selectedTeacher) ? savedTeacher ?? parsedPreferences.selectedTeacher : teacherOptions[0]);
    setRole(parsedPreferences.role);
    setInitialized(true);
  }, [classOptions, teacherOptions]);

  useEffect(() => {
    if (!initialized) return;
    localStorage.setItem("school46.class", className);
    localStorage.setItem("school46.teacher", teacher);
    const savedPreferences = localStorage.getItem(preferencesStorageKey);
    const parsedPreferences = savedPreferences ? { ...defaultPreferences, ...JSON.parse(savedPreferences) } : defaultPreferences;
    const nextClasses = role === "teacher" ? normalizeSelectedClasses(selectedClasses, className, classOptions) : [className];
    localStorage.setItem(preferencesStorageKey, JSON.stringify({ ...parsedPreferences, selectedClass: nextClasses[0] ?? className, selectedClasses: nextClasses, selectedTeacher: teacher, groupName: role === "teacher" ? nextClasses.join(", ") : className }));
  }, [className, classOptions, initialized, role, selectedClasses, teacher]);

  useEffect(() => {
    function syncPreferences(event: Event) {
      const detail = (event as CustomEvent).detail as Partial<UserPreferences> | undefined;
      const nextClass = detail?.selectedClass;
      const nextClasses = detail?.selectedClasses;
      const nextTeacher = detail?.selectedTeacher;
      if (nextClass && classOptions.includes(nextClass)) setClassName(nextClass);
      if (nextClasses?.length) setSelectedClasses(normalizeSelectedClasses(nextClasses, nextClass ?? className, classOptions));
      if (nextTeacher && teacherOptions.includes(nextTeacher)) setTeacher(nextTeacher);
      if (detail?.role) setRole(detail.role);
    }
    window.addEventListener("school46.preferences-updated", syncPreferences);
    return () => window.removeEventListener("school46.preferences-updated", syncPreferences);
  }, [className, classOptions, teacherOptions]);

  function updateClass(value: string) {
    setClassName(value);
    setSelectedClasses([value]);
  }

  function toggleTeacherClass(value: string) {
    setSelectedClasses((current) => {
      const safeCurrent = normalizeSelectedClasses(current, className, classOptions);
      const exists = safeCurrent.includes(value);
      const next = exists
        ? safeCurrent.filter((item) => item !== value)
        : [...safeCurrent, value];
      const safeNext = next.length ? next : [value];
      setClassName(safeNext[0]);
      return safeNext;
    });
  }

  function selectTeacherGroup(group: string) {
    const nextClasses = getClassesByGroup(group, classOptions);
    const safeClasses = nextClasses.length ? nextClasses : activeClasses;
    setSelectedClasses(safeClasses);
    setClassName(safeClasses[0] ?? className);
  }

  function resetTeacherClasses() {
    const safeClass = classOptions.includes(className) ? className : classOptions[0];
    setSelectedClasses([safeClass]);
    setClassName(safeClass);
  }

  const isTeacher = role === "teacher";
  const activeClasses = useMemo(() => isTeacher ? normalizeSelectedClasses(selectedClasses, className, classOptions) : [className], [className, classOptions, isTeacher, selectedClasses]);
  const regularFiltered = useMemo(() => lessons.filter((lesson) => activeClasses.includes(lesson.className)), [activeClasses, lessons]);
  const classChanges = useMemo(() => changes.filter((change) => activeClasses.includes(change.className)), [activeClasses, changes]);
  const filtered = regularFiltered;
  const teacherLessons = useMemo(() => lessons.filter((lesson) => lesson.teacher && lesson.teacher === teacher), [lessons, teacher]);
  const teacherChanges = useMemo(() => changes.filter((change) => change.teacher && change.teacher === teacher), [changes, teacher]);
  const actualChangeDays = useMemo(() => getActualChangeDays(), []);
  const teacherUpcomingItems = useMemo(
    () => actualChangeDays.flatMap((day) => {
      const dayTeacherLessons = teacherLessons.filter((lesson) => lesson.day === day);
      const dayTeacherChanges = teacherChanges.filter((change) => change.day === day);
      const dayOverrideChanges = changes.filter((change) => change.day === day);
      return mergeLessonsWithChanges(dayTeacherLessons, dayTeacherChanges, dayOverrideChanges);
    }),
    [actualChangeDays, changes, teacherChanges, teacherLessons]
  );
  const changeDays = useMemo(
    () => actualChangeDays.filter((day) => classChanges.some((change) => change.day === day)),
    [actualChangeDays, classChanges]
  );
  const visibleDays = useMemo(
    () => dayOrder.filter((day) => filtered.some((lesson) => lesson.day === day)),
    [filtered]
  );

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 rounded-[8px] border border-line bg-white p-4">
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          {isTeacher ? (
            <div className="grid min-w-0 gap-2 sm:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-600">Классы педагога</p>
                <span className="rounded-[8px] bg-mist px-2 py-1 text-xs font-semibold text-slate-500">{formatClassSelection(activeClasses)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {classGroupButtons.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => selectTeacherGroup(item)}
                    className="rounded-[8px] border border-line bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:-translate-y-0.5 hover:text-apple"
                  >
                    {item}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={resetTeacherClasses}
                  className="rounded-[8px] border border-line bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:-translate-y-0.5 hover:text-coral"
                >
                  Сбросить
                </button>
              </div>
              <div className="flex max-h-32 min-w-0 flex-wrap gap-2 overflow-y-auto rounded-[8px] border border-line bg-mist p-2">
                {classOptions.map((item) => {
                  const selected = activeClasses.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleTeacherClass(item)}
                      className={`rounded-[8px] border px-3 py-2 text-sm font-semibold transition ${selected ? "border-apple bg-white text-apple shadow-sm" : "border-line bg-white text-slate-600 hover:-translate-y-0.5"}`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <SelectField label="Класс" value={className} options={classOptions} onChange={updateClass} />
          )}
          {isTeacher ? (
            <SelectField label="Педагог" value={teacher} options={teacherOptions} onChange={setTeacher} />
          ) : null}
        </div>

        <section className="mb-4 min-w-0 overflow-hidden rounded-[8px] border border-amber-200 bg-amber-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-amber-900">Изменения</h3>
            <span className="rounded-[8px] bg-white px-2 py-1 text-xs font-semibold text-amber-800">
              {actualChangeDays.join(" · ")}
            </span>
          </div>
          <div className="mt-3 grid gap-2">
            {changeDays.length ? changeDays.map((day) => (
              <div key={day} className="min-w-0 rounded-[8px] bg-white p-3">
                <h4 className="mb-2 text-sm font-semibold text-amber-900">{day}</h4>
                {isTeacher ? (
                  <TeacherChangeTable day={day} changes={classChanges} classes={activeClasses} />
                ) : (
                  <ClassChangeList day={day} changes={classChanges} />
                )}
              </div>
            )) : <p className="text-sm text-amber-800">На сегодня и следующий учебный день изменений нет.</p>}
          </div>
        </section>

        <div className="grid min-w-0 gap-3">
          {visibleDays.map((day) => (
            <div key={day} className="min-w-0 overflow-hidden rounded-[8px] bg-mist p-3">
              <h3 className="mb-3 font-semibold text-ink">{day}</h3>
              {isTeacher ? (
                <TeacherDaySchedule day={day} lessons={filtered} classes={activeClasses} />
              ) : (
                <ClassDaySchedule day={day} lessons={filtered} />
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="min-w-0 rounded-[8px] border border-line bg-white p-4">
        {isTeacher ? <div className="mb-5">
          <h3 className="mb-3 font-semibold text-ink">Уроки педагога</h3>
          <div className="grid max-h-[520px] gap-2 overflow-y-auto pr-1">
            {teacherUpcomingItems.map((lesson) => (
              <div key={`${lesson.className}-${lesson.day}-${lesson.number}-${lesson.subject}`} className={`rounded-[8px] px-3 py-2 text-sm ${isScheduleChange(lesson) ? "bg-amber-50 text-amber-950" : "bg-mist"}`}>
                <span className="block whitespace-nowrap font-semibold text-ink">{lesson.day} · {lesson.time}</span>
                <span className="block text-slate-600">{lesson.className} · {lesson.subject}</span>
              </div>
            ))}
            {!teacherUpcomingItems.length ? <p className="text-sm text-slate-500">На сегодня и следующий учебный день уроков у выбранного педагога нет.</p> : null}
          </div>
        </div> : null}
        <h3 className="mb-3 font-semibold text-ink">Расписание звонков</h3>
        <div className="grid gap-3">
          {bellGroups.map((group) => {
            const groupBells = bells.filter((bell) => bell.dayGroup === group.dayGroup && bell.shift === group.shift);
            return (
              <details key={`${group.dayGroup}-${group.shift}`} className="group rounded-[8px] bg-mist p-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-ink">
                  <span>{group.title}</span>
                  <span className="grid size-6 place-items-center rounded-full bg-white text-apple transition group-open:rotate-45">+</span>
                </summary>
                <div className="mt-2 grid gap-1">
                  {groupBells.map((bell) => (
                    <div key={`${bell.dayGroup}-${bell.shift}-${bell.lesson}`} className="grid grid-cols-[32px_1fr] rounded-[8px] bg-white px-2 py-1.5 text-sm">
                      <span className="font-semibold text-apple">{bell.lesson}</span>
                      <span>
                        {bell.start} - {bell.end}
                        {bell.break ? <span className="text-xs text-slate-500"> (перемена {bell.break})</span> : null}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ClassDaySchedule({ day, lessons }: { day: string; lessons: ScheduleDisplayItem[] }) {
  return (
    <div className="grid gap-2">
      {lessons
        .filter((lesson) => lesson.day === day)
        .sort((first, second) => first.number - second.number)
        .map((lesson) => (
          <div key={`${lesson.className}-${lesson.day}-${lesson.number}-${lesson.subject}`} className={`grid grid-cols-[40px_1fr_auto] gap-3 rounded-[8px] px-3 py-2 text-sm ${isScheduleChange(lesson) ? "bg-amber-50" : "bg-white"}`}>
            <span className={`font-semibold ${isScheduleChange(lesson) ? "text-coral" : "text-apple"}`}>{lesson.number}</span>
            <span>
              <span className="block font-medium text-ink">{lesson.subject}</span>
              <span className="block text-xs text-slate-500">{[lesson.className, lesson.time, lesson.teacher].filter(Boolean).join(" · ")}</span>
            </span>
            <span className="text-slate-500">{lesson.room ? `каб. ${lesson.room}` : ""}</span>
          </div>
        ))}
    </div>
  );
}

function TeacherDaySchedule({ day, lessons, classes }: { day: string; lessons: ScheduleDisplayItem[]; classes: string[] }) {
  const dayLessons = lessons.filter((lesson) => lesson.day === day);
  const lessonNumbers = Array.from(new Set(dayLessons.map((lesson) => lesson.number))).sort((first, second) => first - second);
  const gridWidth = `${88 + classes.length * 190}px`;
  const gridColumns = `88px repeat(${classes.length}, minmax(190px, 1fr))`;

  return (
    <div className="max-w-full overflow-x-auto rounded-[8px] border border-line bg-white">
      <div
        className="grid w-max min-w-full border-b border-line bg-white text-sm"
        style={{ gridTemplateColumns: gridColumns, width: `max(100%, ${gridWidth})` }}
      >
        <div className="sticky left-0 z-20 border-r border-line bg-white px-3 py-2 font-semibold text-slate-500 shadow-[8px_0_12px_-12px_rgba(15,23,42,0.45)]">Урок</div>
        {classes.map((classItem) => (
          <div key={classItem} className="border-r border-line px-3 py-2 text-center font-semibold text-apple last:border-r-0">
            {classItem}
          </div>
        ))}
      </div>
      <div className="grid w-max min-w-full" style={{ gridTemplateColumns: gridColumns, width: `max(100%, ${gridWidth})` }}>
        {lessonNumbers.map((number) => {
          const rowLessons = dayLessons.filter((lesson) => lesson.number === number);
          const time = rowLessons.find((lesson) => lesson.time)?.time;
          return (
            <div key={`${day}-${number}`} className="contents">
              <div className="sticky left-0 z-10 border-b border-r border-line bg-mist px-3 py-3 text-sm font-semibold text-apple shadow-[8px_0_12px_-12px_rgba(15,23,42,0.45)]">
                <span className="block">{number}</span>
                {time ? <span className="mt-1 block whitespace-nowrap text-xs text-slate-500">{time}</span> : null}
              </div>
              {classes.map((classItem) => {
                const lesson = rowLessons.find((item) => item.className === classItem);
                return (
                  <div key={`${day}-${number}-${classItem}`} className={`min-h-[74px] border-b border-r border-line px-3 py-2 text-sm last:border-r-0 ${lesson && isScheduleChange(lesson) ? "bg-amber-50" : ""}`}>
                    {lesson ? (
                      <div className="grid h-full content-center gap-1">
                        <span className="inline-flex w-fit rounded-[8px] bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-semibold text-apple">{lesson.className}</span>
                        <span className="font-semibold leading-5 text-ink">{lesson.subject}</span>
                        <span className="text-xs leading-5 text-slate-500">{[lesson.teacher, lesson.room ? `каб. ${lesson.room}` : ""].filter(Boolean).join(" · ")}</span>
                      </div>
                    ) : (
                      <span className="grid h-full place-items-center text-xs text-slate-400">—</span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ClassChangeList({ day, changes }: { day: string; changes: ScheduleChange[] }) {
  return (
    <div className="grid gap-2">
      {changes
        .filter((change) => change.day === day)
        .sort(compareChangeTime)
        .map((change) => (
          <div key={change.id} className="grid gap-1 rounded-[8px] bg-amber-50 px-3 py-2 text-sm text-amber-950">
            <span className="font-semibold">{change.time} · {change.number} урок</span>
            <span>{change.className} · {change.subject}</span>
            <span className="text-xs text-amber-800">{[change.teacher, change.room ? `каб. ${change.room}` : "", change.note].filter(Boolean).join(" · ")}</span>
          </div>
        ))}
    </div>
  );
}

function TeacherChangeTable({ day, changes, classes }: { day: string; changes: ScheduleChange[]; classes: string[] }) {
  const dayChanges = changes.filter((change) => change.day === day);
  const changeRows = Array.from(new Set(dayChanges.map((change) => `${change.number}|${change.time}`)))
    .map((key) => {
      const [number, time] = key.split("|");
      return { key, number: Number(number), time };
    })
    .sort((first, second) => first.number - second.number || first.time.localeCompare(second.time, "ru"));
  const gridWidth = `${104 + classes.length * 190}px`;
  const gridColumns = `104px repeat(${classes.length}, minmax(190px, 1fr))`;

  return (
    <div className="max-w-full overflow-x-auto rounded-[8px] border border-amber-200 bg-white">
      <div
        className="grid w-max min-w-full border-b border-amber-200 bg-amber-50 text-sm"
        style={{ gridTemplateColumns: gridColumns, width: `max(100%, ${gridWidth})` }}
      >
        <div className="sticky left-0 z-20 border-r border-amber-200 bg-amber-50 px-3 py-2 font-semibold text-amber-900 shadow-[8px_0_12px_-12px_rgba(146,64,14,0.5)]">Урок</div>
        {classes.map((classItem) => (
          <div key={classItem} className="border-r border-amber-200 px-3 py-2 text-center font-semibold text-amber-900 last:border-r-0">
            {classItem}
          </div>
        ))}
      </div>
      <div className="grid w-max min-w-full" style={{ gridTemplateColumns: gridColumns, width: `max(100%, ${gridWidth})` }}>
        {changeRows.map((row) => (
          <div key={`${day}-${row.key}`} className="contents">
            <div className="sticky left-0 z-10 border-b border-r border-amber-200 bg-amber-50 px-3 py-3 text-sm font-semibold text-amber-900 shadow-[8px_0_12px_-12px_rgba(146,64,14,0.5)]">
              <span className="block">{row.number}</span>
              <span className="mt-1 block whitespace-nowrap text-xs text-amber-700">{row.time}</span>
            </div>
            {classes.map((classItem) => {
              const classChanges = dayChanges.filter((change) => change.className === classItem && change.number === row.number && change.time === row.time);
              return (
                <div key={`${day}-${row.key}-${classItem}`} className="min-h-[72px] border-b border-r border-amber-200 px-3 py-2 text-sm last:border-r-0">
                  {classChanges.length ? (
                    <div className="grid gap-2">
                      {classChanges.map((change) => (
                        <div key={change.id} className="grid gap-1 rounded-[8px] bg-amber-50 px-2 py-2">
                          <span className="inline-flex w-fit rounded-[8px] bg-white px-2 py-0.5 text-xs font-semibold text-amber-900">{change.className}</span>
                          <span className="font-semibold leading-5 text-amber-950">{change.subject}</span>
                          <span className="text-xs leading-5 text-amber-800">{[change.teacher, change.room ? `каб. ${change.room}` : "", change.note].filter(Boolean).join(" · ")}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="grid h-full place-items-center text-xs text-amber-300">—</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function uniqueValues(values: string[], fallback: string[]) {
  const unique = Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
  return unique.length ? unique : fallback;
}

function normalizeSelectedClasses(selectedClasses: string[] | undefined, selectedClass: string, options: string[]) {
  const source = selectedClasses?.length ? selectedClasses : [selectedClass];
  const filtered = source.filter((item) => options.includes(item));
  const fallback = options.includes(selectedClass) ? selectedClass : options[0];
  const unique = Array.from(new Set(filtered.length ? filtered : [fallback]));
  return unique.filter(Boolean);
}

function getClassesByGroup(group: string, options: string[]) {
  if (group === "Все классы") return options;
  const [from, to] = group.match(/\d+/g)?.map(Number) ?? [];
  return options.filter((item) => {
    const number = Number(item.match(/\d{1,2}/)?.[0] ?? 0);
    return number >= from && number <= to;
  });
}

function getActualChangeDays() {
  const todayIndex = new Date().getDay();
  if (todayIndex === 0) return ["Понедельник"];
  if (todayIndex === 6) return ["Суббота", "Понедельник"];
  const currentDay = dayOrder[todayIndex - 1];
  const nextDay = dayOrder[todayIndex];
  return [currentDay, nextDay].filter(Boolean);
}

function compareChangeTime(first: ScheduleChange, second: ScheduleChange) {
  return first.number - second.number || first.time.localeCompare(second.time, "ru") || first.className.localeCompare(second.className, "ru", { numeric: true });
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

function formatClassSelection(classes: string[]) {
  const unique = Array.from(new Set(classes.filter(Boolean)));
  return unique.length > 6 ? `${unique.length} классов выбрано` : unique.join(", ");
}
