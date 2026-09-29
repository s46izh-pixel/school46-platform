"use client";

import { classes, teacherNames } from "@/lib/mock-data";
import { preferencesStorageKey, defaultPreferences } from "@/lib/storage";
import { normalizeClassName, uniqueClasses } from "@/lib/class-utils";
import { BellSchedule, ScheduleChange, ScheduleLesson, UserPreferences } from "@/lib/types";
import { CheckCircle2, ChevronDown, Clock3, DoorOpen, MapPin, Search, X } from "lucide-react";
import type { PointerEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SelectField } from "./selectors";

type ScheduleDisplayItem = ScheduleLesson | ScheduleChange;
type BellGroup = { title: string; dayGroup: BellSchedule["dayGroup"]; shift: BellSchedule["shift"] };

const dayOrder = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
const bellGroups: BellGroup[] = [
  { title: "Понедельник · 1 смена", dayGroup: "monday", shift: 1 },
  { title: "Понедельник · 2 смена", dayGroup: "monday", shift: 2 },
  { title: "Вторник-суббота · 1 смена", dayGroup: "regular", shift: 1 },
  { title: "Вторник-суббота · 2 смена", dayGroup: "regular", shift: 2 }
];
const classGroupButtons = ["1-4 классы", "5-8 классы", "9-11 классы", "Все классы"];
const noSecondTeacherValue = "";
const maxSelectedRooms = 3;

export function ScheduleView({ lessons, bells, changes }: { lessons: ScheduleLesson[]; bells: BellSchedule[]; changes: ScheduleChange[] }) {
  const classOptions = useMemo(() => uniqueClasses(lessons.map((lesson) => lesson.className), classes), [lessons]);
  const teacherOptions = useMemo(() => uniqueValues(lessons.map((lesson) => lesson.teacher), teacherNames), [lessons]);
  const [className, setClassName] = useState(classOptions[0]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([classOptions[0]]);
  const [teacher, setTeacher] = useState(teacherOptions[0]);
  const [secondTeacher, setSecondTeacher] = useState(noSecondTeacherValue);
  const [role, setRole] = useState<UserPreferences["role"]>(defaultPreferences.role);
  const [initialized, setInitialized] = useState(false);
  const [openScheduleDays, setOpenScheduleDays] = useState<string[]>([]);
  const [openChangeDays, setOpenChangeDays] = useState<string[]>([]);
  const [activeBellGroup, setActiveBellGroup] = useState<BellGroup | null>(null);
  const [roomFinderOpen, setRoomFinderOpen] = useState(false);

  useEffect(() => {
    const savedClass = localStorage.getItem("school46.class");
    const savedTeacher = localStorage.getItem("school46.teacher");
    const savedPreferences = localStorage.getItem(preferencesStorageKey);
    const parsedPreferences = savedPreferences ? { ...defaultPreferences, ...JSON.parse(savedPreferences) } : defaultPreferences;
    const preferredClass = normalizeClassName(savedClass ?? parsedPreferences.selectedClass);
    const safeClass = preferredClass && classOptions.includes(preferredClass) ? preferredClass : classOptions[0];
    const safeClasses = normalizeSelectedClasses(parsedPreferences.selectedClasses, safeClass, classOptions);
    const preferredTeacher = savedTeacher ?? parsedPreferences.selectedTeacher;
    const safeTeacher = preferredTeacher && teacherOptions.includes(preferredTeacher) ? preferredTeacher : teacherOptions[0];
    const safeSecondTeacher = parsedPreferences.selectedTeacher2 && teacherOptions.includes(parsedPreferences.selectedTeacher2) && parsedPreferences.selectedTeacher2 !== safeTeacher
      ? parsedPreferences.selectedTeacher2
      : noSecondTeacherValue;
    setClassName(safeClasses[0] ?? safeClass);
    setSelectedClasses(parsedPreferences.role === "teacher" ? safeClasses : [safeClasses[0] ?? safeClass]);
    setTeacher(safeTeacher);
    setSecondTeacher(safeSecondTeacher);
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
    const safeSecondTeacher = secondTeacher && secondTeacher !== teacher ? secondTeacher : noSecondTeacherValue;
    localStorage.setItem(preferencesStorageKey, JSON.stringify({ ...parsedPreferences, selectedClass: nextClasses[0] ?? className, selectedClasses: nextClasses, selectedTeacher: teacher, selectedTeacher2: safeSecondTeacher, groupName: role === "teacher" ? nextClasses.join(", ") : className }));
  }, [className, classOptions, initialized, role, secondTeacher, selectedClasses, teacher]);

  useEffect(() => {
    function syncPreferences(event: Event) {
      const detail = (event as CustomEvent).detail as Partial<UserPreferences> | undefined;
      const nextClass = detail?.selectedClass;
      const nextClasses = detail?.selectedClasses;
      const nextTeacher = detail?.selectedTeacher;
      const nextSecondTeacher = detail?.selectedTeacher2;
      if (nextClass && classOptions.includes(nextClass)) setClassName(nextClass);
      if (nextClasses?.length) setSelectedClasses(normalizeSelectedClasses(nextClasses, nextClass ?? className, classOptions));
      if (nextTeacher && teacherOptions.includes(nextTeacher)) {
        setTeacher(nextTeacher);
        setSecondTeacher((current) => current === nextTeacher ? noSecondTeacherValue : current);
      }
      if (detail && "selectedTeacher2" in detail) {
        if (nextSecondTeacher && teacherOptions.includes(nextSecondTeacher) && nextSecondTeacher !== (nextTeacher ?? teacher)) {
          setSecondTeacher(nextSecondTeacher);
        } else {
          setSecondTeacher(noSecondTeacherValue);
        }
      }
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
    const currentClass = normalizeClassName(className);
    const safeClass = classOptions.includes(currentClass) ? currentClass : classOptions[0];
    setSelectedClasses([safeClass]);
    setClassName(safeClass);
  }

  function toggleScheduleDay(day: string) {
    setOpenScheduleDays((current) => (
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day]
    ));
  }

  function toggleChangeDay(day: string) {
    setOpenChangeDays((current) => (
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day]
    ));
  }

  const isTeacher = role === "teacher";
  const activeClasses = useMemo(() => isTeacher ? normalizeSelectedClasses(selectedClasses, className, classOptions) : [className], [className, classOptions, isTeacher, selectedClasses]);
  const activeTeachers = useMemo(() => Array.from(new Set([teacher, secondTeacher].filter(Boolean))), [secondTeacher, teacher]);
  const regularFiltered = useMemo(() => lessons.filter((lesson) => activeClasses.includes(lesson.className)), [activeClasses, lessons]);
  const classChanges = useMemo(() => changes.filter((change) => activeClasses.includes(change.className)), [activeClasses, changes]);
  const filtered = regularFiltered;
  const teacherLessons = useMemo(() => lessons.filter((lesson) => lesson.teacher && activeTeachers.includes(lesson.teacher)), [activeTeachers, lessons]);
  const teacherChanges = useMemo(() => changes.filter((change) => change.teacher && activeTeachers.includes(change.teacher)), [activeTeachers, changes]);
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
  const defaultChangeDaysKey = changeDays.join("|");
  const visibleDays = useMemo(
    () => dayOrder.filter((day) => filtered.some((lesson) => lesson.day === day)),
    [filtered]
  );
  const defaultScheduleDays = useMemo(() => getDefaultScheduleDays(visibleDays), [visibleDays]);
  const defaultScheduleDaysKey = defaultScheduleDays.join("|");

  useEffect(() => {
    setOpenScheduleDays(defaultScheduleDays);
  }, [defaultScheduleDaysKey, defaultScheduleDays]);

  useEffect(() => {
    setOpenChangeDays(changeDays);
  }, [defaultChangeDaysKey, changeDays]);

  return (
    <div className="grid min-w-0 gap-4">
      <div className="min-w-0 rounded-[8px] border border-line bg-white p-4">
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          {isTeacher ? (
            <div className="grid min-w-0 gap-2 sm:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-600">Классы педагога</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-[8px] bg-mist px-2 py-1 text-xs font-semibold text-slate-500">{formatClassSelection(activeClasses)}</span>
                  <button
                    type="button"
                    onClick={() => setRoomFinderOpen(true)}
                    className="focus-ring flex items-center gap-2 rounded-[8px] bg-[var(--mint)] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5"
                  >
                    <DoorOpen size={17} />
                    Проверить свободный кабинет
                  </button>
                </div>
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
            <>
              <SelectField
                label="Педагог"
                value={teacher}
                options={teacherOptions}
                onChange={(value) => {
                  setTeacher(value);
                  if (secondTeacher === value) setSecondTeacher(noSecondTeacherValue);
                }}
              />
              <label className="grid gap-2 text-sm font-medium text-slate-600">
                Второй педагог
                <select
                  value={secondTeacher}
                  onChange={(event) => setSecondTeacher(event.target.value === teacher ? noSecondTeacherValue : event.target.value)}
                  className="focus-ring rounded-[8px] border border-line bg-white px-3 py-2 text-ink"
                >
                  <option value={noSecondTeacherValue}>Не выбран</option>
                  {teacherOptions.filter((item) => item !== teacher).map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
            </>
          ) : null}
        </div>

        <div className="mb-4 grid min-w-0 gap-3">
          {isTeacher ? (
            <details className="group min-w-0 overflow-hidden rounded-[8px] border border-line bg-white">
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-3 py-3 text-left [&::-webkit-details-marker]:hidden">
                <span>
                  <span className="block font-semibold text-ink">Уроки педагога</span>
                  <span className="block text-xs font-medium text-slate-500">Нажмите, чтобы посмотреть ближайшие уроки</span>
                </span>
                <span className="grid size-8 place-items-center rounded-[8px] bg-mist text-apple transition group-open:rotate-180">
                  <ChevronDown className="size-4" aria-hidden="true" />
                </span>
              </summary>
              <div className="max-h-80 overflow-y-auto border-t border-line bg-mist p-3">
                {actualChangeDays.map((day) => {
                  const dayLessons = teacherUpcomingItems.filter((lesson) => lesson.day === day);
                  if (!dayLessons.length) return null;
                  return (
                    <section key={day} className="mb-4 last:mb-0">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <h4 className="font-semibold text-ink">{day}</h4>
                        <span className="rounded-[8px] bg-white px-2 py-1 text-xs font-semibold text-slate-500">{dayLessons.length} {lessonCountLabel(dayLessons.length)}</span>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {dayLessons.map((lesson) => (
                          <div key={`${lesson.className}-${lesson.day}-${lesson.number}-${lesson.subject}-${lesson.teacher}`} className={`grid grid-cols-[44px_minmax(0,1fr)] gap-3 rounded-[8px] px-3 py-3 text-sm ${isScheduleChange(lesson) ? "bg-amber-50 text-amber-950" : "bg-white"}`}>
                            <span className={`grid size-11 place-items-center rounded-[8px] text-center font-bold ${isScheduleChange(lesson) ? "bg-amber-100 text-amber-900" : "bg-sky-50 text-apple"}`}>
                              {lesson.number}
                            </span>
                            <span className="min-w-0">
                              <span className="block font-semibold text-ink">{lesson.number} урок · {lesson.time}</span>
                              <span className="block text-slate-600">{lesson.className} · {lesson.subject}</span>
                              {activeTeachers.length > 1 && lesson.teacher ? <span className="mt-1 block truncate text-xs text-slate-500">{lesson.teacher}</span> : null}
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                })}
                {!teacherUpcomingItems.length ? <p className="text-sm text-slate-500">На сегодня и следующий учебный день уроков у выбранного педагога нет.</p> : null}
              </div>
            </details>
          ) : null}

          <div className="min-w-0 rounded-[8px] border border-line bg-white p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-ink">Расписание звонков</h3>
              <span className="text-xs font-semibold text-slate-500">Выберите смену, чтобы открыть окно</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {bellGroups.map((group) => (
                <button
                  key={`${group.dayGroup}-${group.shift}`}
                  type="button"
                  onClick={() => setActiveBellGroup(group)}
                  className="flex items-center justify-between gap-2 rounded-[8px] bg-mist px-3 py-3 text-left text-sm font-semibold text-ink transition hover:-translate-y-0.5 hover:text-apple"
                >
                  <span>{group.title}</span>
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white text-apple">+</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <section className="mb-4 min-w-0 overflow-hidden rounded-[8px] border border-amber-200 bg-amber-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-amber-900">Изменения</h3>
            <span className="rounded-[8px] bg-white px-2 py-1 text-xs font-semibold text-amber-800">
              {actualChangeDays.join(" · ")}
            </span>
          </div>
          <div className="mt-3 grid gap-2">
            {changeDays.length ? changeDays.map((day) => {
              const isOpen = openChangeDays.includes(day);
              return (
                <details key={`${day}-${defaultChangeDaysKey}`} className="group min-w-0 overflow-hidden rounded-[8px] bg-white" open={isOpen}>
                  <summary
                    className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-3 py-3 text-left [&::-webkit-details-marker]:hidden"
                    onClick={(event) => {
                      event.preventDefault();
                      toggleChangeDay(day);
                    }}
                  >
                    <span className="font-semibold text-amber-900">{day}</span>
                    <span className="inline-flex min-w-0 items-center gap-2 rounded-[8px] bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 transition group-hover:text-coral">
                      <span className="hidden group-open:inline">Открыто. Нажмите, чтобы свернуть</span>
                      <span className="group-open:hidden">Нажмите, чтобы открыть полностью</span>
                      <ChevronDown className="size-4 shrink-0 transition group-open:rotate-180" aria-hidden="true" />
                    </span>
                  </summary>
                  <div className="px-3 pb-3">
                    {isTeacher ? (
                      <TeacherChangeTable day={day} changes={classChanges} classes={activeClasses} />
                    ) : (
                      <ClassChangeList day={day} changes={classChanges} />
                    )}
                  </div>
                </details>
              );
            }) : <p className="text-sm text-amber-800">На сегодня и следующий учебный день изменений нет.</p>}
          </div>
        </section>

        <div className="grid min-w-0 gap-3">
          {visibleDays.map((day) => {
            const isOpen = openScheduleDays.includes(day);
            return (
              <details key={`${day}-${defaultScheduleDaysKey}`} className="group min-w-0 overflow-hidden rounded-[8px] bg-mist" open={isOpen}>
                <summary
                  className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-3 py-3 text-left [&::-webkit-details-marker]:hidden"
                  onClick={(event) => {
                    event.preventDefault();
                    toggleScheduleDay(day);
                  }}
                >
                  <span className="font-semibold text-ink">{day}</span>
                  <span className="inline-flex min-w-0 items-center gap-2 rounded-[8px] bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition group-hover:text-apple">
                    <span className="hidden group-open:inline">Открыто. Нажмите, чтобы свернуть</span>
                    <span className="group-open:hidden">Нажмите, чтобы открыть полностью</span>
                    <ChevronDown className="size-4 shrink-0 transition group-open:rotate-180" aria-hidden="true" />
                  </span>
                </summary>
                <div className="px-3 pb-3">
                  {isTeacher ? (
                    <TeacherDaySchedule day={day} lessons={filtered} classes={activeClasses} />
                  ) : (
                    <ClassDaySchedule day={day} lessons={filtered} />
                  )}
                </div>
              </details>
            );
          })}
        </div>
      </div>
      {activeBellGroup ? <BellScheduleModal group={activeBellGroup} bells={bells} onClose={() => setActiveBellGroup(null)} /> : null}
      {isTeacher && roomFinderOpen ? <FreeRoomFinder lessons={lessons} changes={changes} onClose={() => setRoomFinderOpen(false)} /> : null}
    </div>
  );
}

type RoomSlot = {
  key: string;
  label: string;
  sort: number;
};

function FreeRoomFinder({ lessons, changes, onClose }: { lessons: ScheduleLesson[]; changes: ScheduleChange[]; onClose: () => void }) {
  const availableDays = useMemo(
    () => dayOrder.filter((day) => lessons.some((lesson) => lesson.day === day) || changes.some((change) => change.day === day)),
    [changes, lessons]
  );
  const rooms = useMemo(() => uniqueRoomNames([...lessons.map((lesson) => lesson.room), ...changes.map((change) => change.room)]), [changes, lessons]);
  const [day, setDay] = useState(() => preferredRoomDay(availableDays));
  const effectiveLessons = useMemo(() => effectiveRoomLessons(day, lessons, changes), [changes, day, lessons]);
  const slots = useMemo(() => roomSlots(effectiveLessons), [effectiveLessons]);
  const [slotKey, setSlotKey] = useState("");
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);

  useEffect(() => {
    if (!availableDays.includes(day)) setDay(preferredRoomDay(availableDays));
  }, [availableDays, day]);

  useEffect(() => {
    if (!slots.some((slot) => slot.key === slotKey)) setSlotKey(slots[0]?.key || "");
  }, [slotKey, slots]);

  const slotLessons = useMemo(
    () => effectiveLessons.filter((lesson) => lessonRoomSlot(lesson).key === slotKey && normalizeRoomName(lesson.room)),
    [effectiveLessons, slotKey]
  );
  const occupiedRooms = useMemo(() => new Set(slotLessons.flatMap((lesson) => parseRoomNames(lesson.room))), [slotLessons]);
  const freeRooms = useMemo(() => rooms.filter((item) => !occupiedRooms.has(item)), [occupiedRooms, rooms]);

  function toggleRoom(room: string) {
    setSelectedRooms((current) => {
      if (current.includes(room)) return current.filter((item) => item !== room);
      if (current.length >= maxSelectedRooms) return current;
      return [...current, room];
    });
  }

  function addRoom(room: string) {
    if (!room) return;
    setSelectedRooms((current) => current.includes(room) || current.length >= maxSelectedRooms ? current : [...current, room]);
  }

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/40 px-3 py-3 backdrop-blur-sm sm:px-4" onClick={onClose}>
      <section className="max-h-[calc(100dvh-24px)] w-full max-w-4xl overflow-y-auto rounded-[8px] border border-line bg-white p-4 shadow-soft sm:p-5" onClick={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="flex items-center gap-2 text-sm font-semibold text-[var(--mint)]"><DoorOpen size={17} /> Кабинеты школы</p>
              <span className="rounded-[8px] border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">Функция тестируется</span>
            </div>
            <h3 className="mt-1 text-2xl font-bold text-ink">Проверить свободный кабинет</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">Выберите день и время. Сначала применяются актуальные изменения, затем данные основного расписания.</p>
          </div>
          <button type="button" onClick={onClose} className="focus-ring grid size-10 shrink-0 place-items-center rounded-[8px] bg-mist text-ink transition hover:text-coral" aria-label="Закрыть поиск кабинета"><X size={20} /></button>
        </div>

        {rooms.length && slots.length ? (
          <>
            <div className="grid gap-3 rounded-[8px] border border-line bg-mist p-3 md:grid-cols-3">
              <RoomSelect label="День недели" value={day} options={availableDays.map((value) => ({ value, label: value }))} onChange={setDay} />
              <RoomSelect label="Урок и время" value={slotKey} options={slots.map((slot) => ({ value: slot.key, label: slot.label }))} onChange={setSlotKey} />
              <RoomSelect
                label={`Добавить кабинет · ${selectedRooms.length} из ${maxSelectedRooms}`}
                value=""
                options={[
                  { value: "", label: selectedRooms.length >= maxSelectedRooms ? "Выбрано 3 кабинета" : "Выберите кабинет" },
                  ...(selectedRooms.length >= maxSelectedRooms ? [] : rooms.filter((room) => !selectedRooms.includes(room)).map((value) => ({ value, label: `Кабинет ${value}` })))
                ]}
                onChange={addRoom}
              />
            </div>

            {selectedRooms.length ? (
              <div className="mt-4 grid gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-600">Выбранные кабинеты</p>
                  <button type="button" onClick={() => setSelectedRooms([])} className="text-xs font-semibold text-slate-500 transition hover:text-coral">Очистить</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedRooms.map((room) => (
                    <button key={room} type="button" onClick={() => toggleRoom(room)} className="focus-ring flex items-center gap-2 rounded-[8px] bg-ink px-3 py-2 text-sm font-semibold text-white" aria-label={`Убрать кабинет ${room}`}>
                      Кабинет {room} <X size={14} />
                    </button>
                  ))}
                </div>
                <div className={`grid gap-3 ${roomComparisonGridClass(selectedRooms.length)}`}>
                  {selectedRooms.map((room) => {
                    const selectedRoomLessons = slotLessons.filter((lesson) => parseRoomNames(lesson.room).includes(room));
                    return (
                      <div key={room} className={`flex items-start gap-3 rounded-[8px] border p-4 ${selectedRoomLessons.length ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"}`}>
                        {selectedRoomLessons.length ? <Clock3 className="mt-0.5 shrink-0 text-rose-600" size={20} /> : <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-700" size={20} />}
                        <div className="min-w-0">
                          <p className={`font-semibold ${selectedRoomLessons.length ? "text-rose-800" : "text-emerald-800"}`}>
                            Кабинет {room} {selectedRoomLessons.length ? "занят" : "свободен"}
                          </p>
                          {selectedRoomLessons.length ? (
                            <div className="mt-1 grid gap-1 text-sm text-rose-700">
                              {selectedRoomLessons.map((lesson) => <p key={`${lesson.className}-${lesson.number}-${lesson.subject}`}>{lesson.className} · {lesson.subject}{lesson.teacher ? ` · ${lesson.teacher}` : ""}</p>)}
                            </div>
                          ) : <p className="mt-1 text-sm text-emerald-700">На выбранном уроке занятий нет.</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="mt-5 grid gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="flex items-center gap-2 font-semibold text-ink"><Search size={18} className="text-[var(--mint)]" /> Свободные кабинеты</h4>
                <span className="rounded-[8px] bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">{freeRooms.length} из {rooms.length}</span>
              </div>
              {freeRooms.length ? (
                <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-[8px] border border-emerald-200 bg-emerald-50 p-3">
                  {freeRooms.map((item) => (
                    <button key={item} type="button" onClick={() => toggleRoom(item)} disabled={!selectedRooms.includes(item) && selectedRooms.length >= maxSelectedRooms} className={`focus-ring flex items-center gap-1 rounded-[8px] border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${selectedRooms.includes(item) ? "border-emerald-700 bg-emerald-700 text-white" : "border-emerald-200 bg-white text-emerald-800 hover:border-emerald-500"}`}>
                      <MapPin size={14} /> {item}
                    </button>
                  ))}
                </div>
              ) : <p className="rounded-[8px] bg-rose-50 px-4 py-3 text-sm text-rose-700">На выбранном уроке свободных кабинетов по данным расписания нет.</p>}
            </div>

            {selectedRooms.length ? (
              <div className="mt-5 grid gap-3 border-t border-line pt-5">
                <h4 className="font-semibold text-ink">Занятость выбранных кабинетов · {day}</h4>
                <div className={`grid gap-3 ${roomComparisonGridClass(selectedRooms.length)}`}>
                  {selectedRooms.map((room) => (
                    <section key={room} className="min-w-0">
                      <h5 className="mb-2 border-b border-line pb-2 font-semibold text-ink">Кабинет {room}</h5>
                      <div className="grid gap-2">
                        {slots.map((slot) => {
                          const occupied = effectiveLessons.filter((lesson) => lessonRoomSlot(lesson).key === slot.key && parseRoomNames(lesson.room).includes(room));
                          return (
                            <div key={slot.key} className={`rounded-[8px] border px-3 py-3 text-sm ${occupied.length ? "border-rose-100 bg-rose-50" : "border-emerald-100 bg-emerald-50"}`}>
                              <p className="font-semibold text-ink">{slot.label}</p>
                              {occupied.length ? occupied.map((lesson) => <p key={`${lesson.className}-${lesson.number}-${lesson.subject}`} className="mt-1 text-xs leading-5 text-rose-700">Занят · {lesson.className} · {lesson.subject}</p>) : <p className="mt-1 text-xs font-semibold text-emerald-700">Свободен</p>}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <p className="rounded-[8px] border border-dashed border-line bg-mist p-6 text-center text-sm text-slate-500">В загруженном расписании пока нет данных о кабинетах или времени уроков.</p>
        )}
      </section>
    </div>
  );
}

function RoomSelect({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return (
    <label className="grid min-w-0 gap-1 text-sm font-semibold text-slate-600">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="focus-ring min-w-0 rounded-[8px] border border-line bg-white px-3 py-2.5 font-normal text-ink">
        {options.map((option) => <option key={option.value || "empty"} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function roomComparisonGridClass(roomCount: number) {
  if (roomCount === 1) return "grid-cols-1";
  if (roomCount === 2) return "md:grid-cols-2";
  return "md:grid-cols-3";
}

function BellScheduleModal({ group, bells, onClose }: { group: BellGroup; bells: BellSchedule[]; onClose: () => void }) {
  const groupBells = bells.filter((bell) => bell.dayGroup === group.dayGroup && bell.shift === group.shift);

  return (
    <div className="fixed inset-0 z-[110] grid place-items-center bg-slate-950/35 px-3 backdrop-blur-sm sm:px-4" onClick={onClose}>
      <section className="max-h-[calc(100dvh-24px)] w-full max-w-md overflow-y-auto rounded-[8px] border border-line bg-white p-4 shadow-soft sm:max-h-[calc(100dvh-32px)] sm:p-5" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-apple">Расписание звонков</p>
            <h3 className="text-2xl font-bold text-ink">{group.title}</h3>
          </div>
          <button type="button" onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-[8px] bg-mist text-ink transition hover:text-coral" aria-label="Закрыть расписание звонков">
            <X size={20} />
          </button>
        </div>
        <div className="grid gap-2">
          {groupBells.map((bell) => (
            <div key={`${bell.dayGroup}-${bell.shift}-${bell.lesson}`} className="grid grid-cols-[44px_1fr] items-center rounded-[8px] bg-mist px-3 py-2 text-sm">
              <span className="font-semibold text-apple">{bell.lesson}</span>
              <span>
                <span className="font-semibold text-ink">{bell.start} - {bell.end}</span>
                {bell.break ? <span className="block text-xs text-slate-500">перемена {bell.break}</span> : null}
              </span>
            </div>
          ))}
        </div>
      </section>
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
    <DraggableHorizontalScroll className="max-w-full overflow-x-auto rounded-[8px] border border-line bg-white">
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
    </DraggableHorizontalScroll>
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
    <DraggableHorizontalScroll className="max-w-full overflow-x-auto rounded-[8px] border border-amber-200 bg-white">
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
    </DraggableHorizontalScroll>
  );
}

function DraggableHorizontalScroll({ className, children }: { className: string; children: ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ active: false, startX: 0, startScrollLeft: 0 });
  const [isDragging, setIsDragging] = useState(false);

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    const element = scrollRef.current;
    if (!element || element.scrollWidth <= element.clientWidth) return;
    dragState.current = { active: true, startX: event.clientX, startScrollLeft: element.scrollLeft };
    setIsDragging(true);
    element.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const element = scrollRef.current;
    if (!element || !dragState.current.active) return;
    event.preventDefault();
    element.scrollLeft = dragState.current.startScrollLeft - (event.clientX - dragState.current.startX);
  }

  function stopDrag(event: PointerEvent<HTMLDivElement>) {
    const element = scrollRef.current;
    if (!element || !dragState.current.active) return;
    dragState.current.active = false;
    setIsDragging(false);
    if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
  }

  return (
    <div
      ref={scrollRef}
      className={`${className} cursor-grab select-none ${isDragging ? "cursor-grabbing" : ""}`}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      onPointerLeave={stopDrag}
    >
      {children}
    </div>
  );
}

function preferredRoomDay(availableDays: string[]) {
  const today = new Date().getDay();
  const todayName = today >= 1 && today <= 6 ? dayOrder[today - 1] : dayOrder[0];
  return availableDays.includes(todayName) ? todayName : availableDays[0] || dayOrder[0];
}

function effectiveRoomLessons(day: string, lessons: ScheduleLesson[], changes: ScheduleChange[]): ScheduleDisplayItem[] {
  const dayChanges = changes.filter((change) => change.day === day);
  const changedClasses = new Set(dayChanges.map((change) => `${change.day}|${change.className}`));
  return [
    ...dayChanges,
    ...lessons.filter((lesson) => lesson.day === day && !changedClasses.has(`${lesson.day}|${lesson.className}`))
  ];
}

function roomSlots(items: ScheduleDisplayItem[]): RoomSlot[] {
  const grouped = new Map<string, { sort: number; time: string; numbers: Set<number> }>();
  items.forEach((item) => {
    const slot = lessonRoomSlot(item);
    const current = grouped.get(slot.key) || { sort: slot.sort, time: slot.label, numbers: new Set<number>() };
    current.numbers.add(item.number);
    grouped.set(slot.key, current);
  });
  return Array.from(grouped.entries())
    .map(([key, value]) => {
      const numbers = Array.from(value.numbers).sort((first, second) => first - second);
      const numberLabel = numbers.length ? `${numbers.join("/")} урок` : "";
      return { key, sort: value.sort, label: [value.time, numberLabel].filter(Boolean).join(" · ") };
    })
    .sort((first, second) => first.sort - second.sort || first.label.localeCompare(second.label, "ru", { numeric: true }));
}

function lessonRoomSlot(lesson: ScheduleDisplayItem): RoomSlot {
  const time = (lesson.time || "").trim();
  const timeParts = Array.from(time.matchAll(/(\d{1,2})[.:](\d{2})/g));
  if (timeParts.length) {
    const hour = Number(timeParts[0][1]);
    const minute = Number(timeParts[0][2]);
    const normalizedTime = time
      .replace(/(\d{1,2})[.:](\d{2})/g, (_, hours: string, minutes: string) => `${hours.padStart(2, "0")}:${minutes}`)
      .replace(/\s*[-–—]\s*/g, "–");
    return { key: `time-${hour * 60 + minute}`, label: normalizedTime, sort: hour * 60 + minute };
  }
  return { key: `lesson-${lesson.number}`, label: "", sort: 2000 + lesson.number };
}

function uniqueRoomNames(values: string[]) {
  const rooms = new Map<string, string>();
  values.forEach((value) => {
    parseRoomNames(value).forEach((normalized) => {
      if (!rooms.has(normalized)) rooms.set(normalized, normalized);
    });
  });
  return Array.from(rooms.values()).sort((first, second) => first.localeCompare(second, "ru", { numeric: true }));
}

function parseRoomNames(value: string) {
  return Array.from(new Set((value || "").split(/\s*[/,;]\s*/).map(normalizeRoomName).filter(Boolean)));
}

function normalizeRoomName(value: string) {
  const normalized = (value || "")
    .trim()
    .replace(/^каб(?:инет)?\.?\s*/i, "")
    .replace(/^№\s*/, "")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("ru");
  return ["", "-", "—", "нет", "без кабинета"].includes(normalized) ? "" : normalized;
}

function uniqueValues(values: string[], fallback: string[]) {
  const unique = Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
  return unique.length ? unique : fallback;
}

function normalizeSelectedClasses(selectedClasses: string[] | undefined, selectedClass: string, options: string[]) {
  const source = (selectedClasses?.length ? selectedClasses : [selectedClass]).map(normalizeClassName).filter(Boolean);
  const filtered = source.filter((item) => options.includes(item));
  const currentClass = normalizeClassName(selectedClass);
  const fallback = options.includes(currentClass) ? currentClass : options[0];
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
  return getDefaultScheduleDays(dayOrder);
}

function getDefaultScheduleDays(availableDays: string[]) {
  const available = availableDays.filter((day) => dayOrder.includes(day));
  const todayIndex = new Date().getDay();
  const currentIndex = todayIndex === 0 ? 0 : todayIndex - 1;
  const nextIndex = currentIndex >= dayOrder.length - 1 ? 0 : currentIndex + 1;
  const primary = [dayOrder[currentIndex], dayOrder[nextIndex]].filter((day) => available.includes(day));
  const fallback = available.filter((day) => !primary.includes(day));
  return [...primary, ...fallback].slice(0, 2);
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

function lessonCountLabel(count: number) {
  const lastTwoDigits = count % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return "уроков";
  const lastDigit = count % 10;
  if (lastDigit === 1) return "урок";
  if (lastDigit >= 2 && lastDigit <= 4) return "урока";
  return "уроков";
}
