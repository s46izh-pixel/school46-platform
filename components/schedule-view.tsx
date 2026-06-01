"use client";

import { classes, days, teacherNames } from "@/lib/mock-data";
import { BellSchedule, ScheduleLesson } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
import { SelectField } from "./selectors";

export function ScheduleView({ lessons, bells }: { lessons: ScheduleLesson[]; bells: BellSchedule[] }) {
  const classOptions = useMemo(() => uniqueValues(lessons.map((lesson) => lesson.className), classes), [lessons]);
  const teacherOptions = useMemo(() => uniqueValues(lessons.map((lesson) => lesson.teacher), teacherNames), [lessons]);
  const [className, setClassName] = useState(classOptions[0]);
  const [teacher, setTeacher] = useState(teacherOptions[0]);

  useEffect(() => {
    const savedClass = localStorage.getItem("school46.class");
    const savedTeacher = localStorage.getItem("school46.teacher");
    setClassName(savedClass && classOptions.includes(savedClass) ? savedClass : classOptions[0]);
    setTeacher(savedTeacher && teacherOptions.includes(savedTeacher) ? savedTeacher : teacherOptions[0]);
  }, [classOptions, teacherOptions]);

  useEffect(() => {
    localStorage.setItem("school46.class", className);
    localStorage.setItem("school46.teacher", teacher);
  }, [className, teacher]);

  const filtered = useMemo(
    () => lessons.filter((lesson) => lesson.className === className || lesson.teacher === teacher),
    [className, lessons, teacher]
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="rounded-[8px] border border-line bg-white p-4">
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <SelectField label="Класс" value={className} options={classOptions} onChange={setClassName} />
          <SelectField label="Педагог" value={teacher} options={teacherOptions} onChange={setTeacher} />
        </div>
        <div className="grid gap-3">
          {days.map((day) => (
            <div key={day} className="rounded-[8px] bg-mist p-3">
              <h3 className="mb-3 font-semibold text-ink">{day}</h3>
              <div className="grid gap-2">
                {filtered
                  .filter((lesson) => lesson.day === day)
                  .slice(0, 6)
                  .map((lesson) => (
                    <div key={`${lesson.className}-${lesson.day}-${lesson.number}`} className="grid grid-cols-[40px_1fr_auto] gap-3 rounded-[8px] bg-white px-3 py-2 text-sm">
                      <span className="font-semibold text-apple">{lesson.number}</span>
                      <span>
                        <span className="block font-medium text-ink">{lesson.subject}</span>
                        <span className="block text-xs text-slate-500">{lesson.teacher} · {lesson.className}</span>
                      </span>
                      <span className="text-slate-500">каб. {lesson.room}</span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-[8px] border border-line bg-white p-4">
        <h3 className="mb-3 font-semibold text-ink">Расписание звонков</h3>
        <div className="grid gap-2">
          {bells.map((bell) => (
            <div key={bell.lesson} className="grid grid-cols-[40px_1fr_auto] rounded-[8px] bg-mist px-3 py-2 text-sm">
              <span className="font-semibold text-apple">{bell.lesson}</span>
              <span>{bell.start} - {bell.end}</span>
              <span className="text-slate-500">{bell.break}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function uniqueValues(values: string[], fallback: string[]) {
  const unique = Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
  return unique.length ? unique : fallback;
}
