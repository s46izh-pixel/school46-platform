"use client";

import { uniqueClasses } from "@/lib/class-utils";
import { classes } from "@/lib/mock-data";
import { defaultPreferences, preferencesStorageKey } from "@/lib/storage";
import type { ScheduleLesson, UserPreferences } from "@/lib/types";
import { Check, GraduationCap, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const roles: Array<{ id: UserPreferences["role"]; title: string; text: string }> = [
  { id: "student", title: "Ученик", text: "Покажем ваш класс и учебный день." },
  { id: "teacher", title: "Педагог", text: "Сделаем акцент на уроках педагога." },
  { id: "parent", title: "Родитель", text: "Будет видно расписание класса ребёнка." }
];

const onboardingVersion = 1;

export function WelcomePersonalizer() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [classOptions, setClassOptions] = useState(() => uniqueClasses(classes, classes));
  const [teacherOptions, setTeacherOptions] = useState<string[]>([]);
  const [draft, setDraft] = useState<UserPreferences>(defaultPreferences);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(preferencesStorageKey);
    const parsed = saved ? { ...defaultPreferences, ...JSON.parse(saved) } : defaultPreferences;
    setDraft(parsed);
    setVisible(!parsed.onboardingDone || parsed.onboardingVersion !== onboardingVersion);

    fetch("/api/schedule", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { lessons?: ScheduleLesson[] }) => {
        const nextClasses = uniqueClasses(data.lessons?.map((lesson) => lesson.className) ?? [], classes);
        const nextTeachers = Array.from(new Set(data.lessons?.map((lesson) => lesson.teacher.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ru"));
        setClassOptions(nextClasses);
        setTeacherOptions(nextTeachers);
        setDraft((current) => ({
          ...current,
          selectedClass: nextClasses.includes(current.selectedClass) ? current.selectedClass : nextClasses[0] ?? current.selectedClass,
          selectedTeacher: nextTeachers.includes(current.selectedTeacher) ? current.selectedTeacher : nextTeachers[0] ?? current.selectedTeacher
        }));
      })
      .catch(() => setClassOptions(uniqueClasses(classes, classes)));
  }, []);

  useEffect(() => {
    document.body.style.overflow = visible ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [visible]);

  function update(value: Partial<UserPreferences>) {
    setDraft((current) => ({ ...current, ...value }));
  }

  function finish() {
    const next = { ...draft, onboardingDone: true, onboardingVersion, groupName: draft.selectedClass };
    localStorage.setItem(preferencesStorageKey, JSON.stringify(next));
    localStorage.setItem("school46.class", next.selectedClass);
    localStorage.setItem("school46.teacher", next.selectedTeacher);
    document.documentElement.dataset.theme = next.theme;
    document.documentElement.dataset.design = next.design;
    window.dispatchEvent(new CustomEvent("school46.preferences-updated", { detail: next }));
    setVisible(false);
  }

  if (!mounted || !visible) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/35 px-4 backdrop-blur-md">
      <section className="sticker-panel w-full max-w-2xl rounded-[8px] border border-white/70 bg-white/95 p-5 shadow-soft backdrop-blur-2xl sm:p-6">
        <div className="mb-5 flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] bg-[var(--accent-soft)] text-apple">
            <GraduationCap size={24} />
          </span>
          <div>
            <p className="text-sm font-semibold text-apple">Добро пожаловать</p>
            <h2 className="text-2xl font-semibold text-ink">Настроим сайт под вас</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Это займёт пару секунд. Если выберете не то, всё можно поменять в настройках.</p>
          </div>
        </div>

        <div className="grid gap-4">
          <input
            value={draft.userName}
            onChange={(event) => update({ userName: event.target.value })}
            placeholder="Как к вам обращаться?"
            className="focus-ring rounded-[8px] border border-line bg-white px-3 py-3 text-ink"
          />

          <div className="grid gap-2 sm:grid-cols-3">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => update({ role: role.id })}
                className={`rounded-[8px] border p-3 text-left transition hover:-translate-y-0.5 ${draft.role === role.id ? "border-apple bg-[var(--accent-soft)] text-apple" : "border-line bg-white text-slate-600"}`}
              >
                <span className="mb-2 flex items-center gap-2 font-semibold"><UsersRound size={17} /> {role.title}</span>
                <span className="block text-xs leading-5">{role.text}</span>
              </button>
            ))}
          </div>

          {draft.role === "teacher" ? (
            <label className="grid gap-2 text-sm font-semibold text-slate-600">
              Педагог
              <select value={draft.selectedTeacher} onChange={(event) => update({ selectedTeacher: event.target.value })} className="focus-ring rounded-[8px] border border-line bg-white px-3 py-3 text-ink">
                {teacherOptions.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          ) : (
            <label className="grid gap-2 text-sm font-semibold text-slate-600">
              Класс
              <select value={draft.selectedClass} onChange={(event) => update({ selectedClass: event.target.value, groupName: event.target.value })} className="focus-ring rounded-[8px] border border-line bg-white px-3 py-3 text-ink">
                {classOptions.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          )}

          <button onClick={finish} className="focus-ring flex h-12 items-center justify-center gap-2 rounded-[8px] bg-ink px-5 font-semibold text-white">
            <Check size={18} />
            Продолжить
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
}
