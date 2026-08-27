"use client";

import { classes, teacherNames } from "@/lib/mock-data";
import { preferencesStorageKey, defaultPreferences } from "@/lib/storage";
import { uniqueClasses } from "@/lib/class-utils";
import { BellSchedule, ScheduleChange, ScheduleLesson, UserPreferences } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
import { SelectField } from "./selectors";

const dayOrder = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
const bellGroups: Array<{ title: string; dayGroup: BellSchedule["dayGroup"]; shift: BellSchedule["shift"] }> = [
  { title: "Понедельник · 1 смена", dayGroup: "monday", shift: 1 },
  { title: "Понедельник · 2 смена", dayGroup: "monday", shift: 2 },
  { title: "Вторник-суббота · 1 смена", dayGroup: "regular", shift: 1 },
  { title: "Вторник-суббота · 2 смена", dayGroup: "regular", shift: 2 }
];

export function ScheduleView({ lessons, bells, changes }: { lessons: ScheduleLesson[]; bells: BellSchedule[]; changes: ScheduleChange[] }) {
  const classOptions = useMemo(() => uniqueClasses(lessons.map((lesson) => lesson.className), classes), [lessons]);
  const teacherOptions = useMemo(() => uniqueValues(lessons.map((lesson) => lesson.teacher), teacherNames), [lessons]);
  const [className, setClassName] = useState(classOptions[0]);
  const [teacher, setTeacher] = useState(teacherOptions[0]);
  const [role, setRole] = useState<UserPreferences["role"]>(defaultPreferences.role);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const savedClass = localStorage.getItem("school46.class");
    const savedTeacher = localStorage.getItem("school46.teacher");
    const savedPreferences = localStorage.getItem(preferencesStorageKey);
    const parsedPreferences = savedPreferences ? { ...defaultPreferences, ...JSON.parse(savedPreferences) } : defaultPreferences;
    const preferredClass = savedClass ?? parsedPreferences.selectedClass;
    setClassName(preferredClass && classOptions.includes(preferredClass) ? preferredClass : classOptions[0]);
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
    localStorage.setItem(preferencesStorageKey, JSON.stringify({ ...parsedPreferences, selectedClass: className, selectedTeacher: teacher, groupName: className }));
  }, [className, initialized, teacher]);

  useEffect(() => {
    function syncPreferences(event: Event) {
      const detail = (event as CustomEvent).detail as Partial<UserPreferences> | undefined;
      const nextClass = detail?.selectedClass;
      const nextTeacher = detail?.selectedTeacher;
      if (nextClass && classOptions.includes(nextClass)) setClassName(nextClass);
      if (nextTeacher && teacherOptions.includes(nextTeacher)) setTeacher(nextTeacher);
      if (detail?.role) setRole(detail.role);
    }
    window.addEventListener("school46.preferences-updated", syncPreferences);
    return () => window.removeEventListener("school46.preferences-updated", syncPreferences);
  }, [classOptions, teacherOptions]);

  const isTeacher = role === "teacher";
  const filtered = useMemo(() => lessons.filter((lesson) => lesson.className === className), [className, lessons]);
  const teacherLessons = useMemo(() => lessons.filter((lesson) => lesson.teacher && lesson.teacher === teacher), [lessons, teacher]);
  const classChanges = useMemo(() => changes.filter((change) => change.className === className), [changes, className]);
  const changeDays = useMemo(
    () => dayOrder.filter((day) => classChanges.some((change) => change.day === day)),
    [classChanges]
  );
  const visibleDays = useMemo(
    () => dayOrder.filter((day) => filtered.some((lesson) => lesson.day === day)),
    [filtered]
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="rounded-[8px] border border-line bg-white p-4">
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <SelectField label="Класс" value={className} options={classOptions} onChange={setClassName} />
          {isTeacher ? (
            <SelectField label="Педагог" value={teacher} options={teacherOptions} onChange={setTeacher} />
          ) : null}
        </div>

        <section className="mb-4 rounded-[8px] border border-amber-200 bg-amber-50 p-3">
          <h3 className="font-semibold text-amber-900">Изменения</h3>
          <div className="mt-3 grid gap-2">
            {changeDays.length ? changeDays.map((day) => (
              <div key={day} className="rounded-[8px] bg-white p-3">
                <h4 className="mb-2 text-sm font-semibold text-amber-900">{day}</h4>
                <div className="grid gap-2">
                  {classChanges
                    .filter((change) => change.day === day)
                    .map((change) => (
                      <div key={change.id} className="grid gap-1 rounded-[8px] bg-amber-50 px-3 py-2 text-sm text-amber-950">
                        <span className="font-semibold">{change.time} · {change.number} урок</span>
                        <span>{change.subject}</span>
                        <span className="text-xs text-amber-800">{[change.teacher, change.room ? `каб. ${change.room}` : ""].filter(Boolean).join(" · ")}</span>
                      </div>
                    ))}
                </div>
              </div>
            )) : <p className="text-sm text-amber-800">Для выбранного класса изменений нет.</p>}
          </div>
        </section>

        <div className="grid gap-3">
          {visibleDays.map((day) => (
            <div key={day} className="rounded-[8px] bg-mist p-3">
              <h3 className="mb-3 font-semibold text-ink">{day}</h3>
              <div className="grid gap-2">
                {filtered
                  .filter((lesson) => lesson.day === day)
                  .map((lesson) => (
                    <div key={`${lesson.className}-${lesson.day}-${lesson.number}-${lesson.subject}`} className="grid grid-cols-[40px_1fr_auto] gap-3 rounded-[8px] bg-white px-3 py-2 text-sm">
                      <span className="font-semibold text-apple">{lesson.number}</span>
                      <span>
                        <span className="block font-medium text-ink">{lesson.subject}</span>
                        <span className="block text-xs text-slate-500">{[lesson.time, lesson.teacher].filter(Boolean).join(" · ")}</span>
                      </span>
                      <span className="text-slate-500">{lesson.room ? `каб. ${lesson.room}` : ""}</span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-[8px] border border-line bg-white p-4">
        <h3 className="mb-3 font-semibold text-ink">Расписание звонков</h3>
        <div className="grid gap-3">
          {bellGroups.map((group) => {
            const groupBells = bells.filter((bell) => bell.dayGroup === group.dayGroup && bell.shift === group.shift);
            return (
              <section key={`${group.dayGroup}-${group.shift}`} className="rounded-[8px] bg-mist p-3">
                <h4 className="mb-2 text-sm font-semibold text-ink">{group.title}</h4>
                <div className="grid gap-1">
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
              </section>
            );
          })}
        </div>
        {isTeacher ? <div className="mt-5 border-t border-line pt-4">
          <h3 className="mb-3 font-semibold text-ink">Уроки педагога</h3>
          <div className="grid gap-2">
            {teacherLessons.slice(0, 8).map((lesson) => (
              <div key={`${lesson.className}-${lesson.day}-${lesson.number}-${lesson.subject}`} className="rounded-[8px] bg-mist px-3 py-2 text-sm">
                <span className="block font-semibold text-ink">{lesson.day} · {lesson.time}</span>
                <span className="block text-slate-600">{lesson.className} · {lesson.subject}</span>
              </div>
            ))}
            {!teacherLessons.length ? <p className="text-sm text-slate-500">Выберите педагога из списка.</p> : null}
          </div>
        </div> : null}
      </div>
    </div>
  );
}

function uniqueValues(values: string[], fallback: string[]) {
  const unique = Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
  return unique.length ? unique : fallback;
}
