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
const classGroupButtons = ["1-4 классы", "5-8 классы", "9-11 классы", "Все классы"];

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
          selectedClasses: normalizeSelectedClasses(current.selectedClasses, current.selectedClass, nextClasses),
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
    const selectedClasses = draft.role === "teacher" ? normalizeSelectedClasses(draft.selectedClasses, draft.selectedClass, classOptions) : [draft.selectedClass];
    const next = { ...draft, selectedClass: selectedClasses[0] ?? draft.selectedClass, selectedClasses, onboardingDone: true, onboardingVersion, groupName: draft.role === "teacher" ? selectedClasses.join(", ") : draft.selectedClass };
    localStorage.setItem(preferencesStorageKey, JSON.stringify(next));
    localStorage.setItem("school46.class", next.selectedClass);
    localStorage.setItem("school46.teacher", next.selectedTeacher);
    document.documentElement.dataset.theme = next.theme;
    document.documentElement.dataset.design = next.design;
    window.dispatchEvent(new CustomEvent("school46.preferences-updated", { detail: next }));
    setVisible(false);
  }

  function toggleTeacherClass(className: string) {
    setDraft((current) => {
      const currentClasses = normalizeSelectedClasses(current.selectedClasses, current.selectedClass, classOptions);
      const exists = currentClasses.includes(className);
      const selectedClasses = exists
        ? currentClasses.filter((item) => item !== className)
        : [...currentClasses, className];
      const safeClasses = selectedClasses.length ? selectedClasses : [className];
      return { ...current, selectedClass: safeClasses[0], selectedClasses: safeClasses, groupName: safeClasses.join(", ") };
    });
  }

  function selectTeacherGroup(group: string) {
    setDraft((current) => {
      const selectedClasses = getClassesByGroup(group, classOptions);
      const safeClasses = selectedClasses.length ? selectedClasses : normalizeSelectedClasses(current.selectedClasses, current.selectedClass, classOptions);
      return { ...current, selectedClass: safeClasses[0] ?? current.selectedClass, selectedClasses: safeClasses, groupName: safeClasses.join(", ") };
    });
  }

  function resetTeacherClasses() {
    setDraft((current) => {
      const safeClass = classOptions.includes(current.selectedClass) ? current.selectedClass : classOptions[0];
      return { ...current, selectedClass: safeClass, selectedClasses: [safeClass], groupName: safeClass };
    });
  }

  if (!mounted || !visible) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/35 px-3 py-3 backdrop-blur-md sm:px-4">
      <section className="sticker-panel flex max-h-[calc(100dvh-24px)] w-full max-w-2xl flex-col overflow-hidden rounded-[8px] border border-white/70 bg-white/95 shadow-soft backdrop-blur-2xl">
        <div className="shrink-0 border-b border-line/70 p-4 pb-3 sm:p-5">
          <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] bg-[var(--accent-soft)] text-apple">
            <GraduationCap size={24} />
          </span>
          <div>
            <p className="text-sm font-semibold text-apple">Добро пожаловать</p>
            <h2 className="text-2xl font-semibold text-ink">Настроим сайт под вас</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Это займёт пару секунд. Если выберете не то, всё можно поменять в настройках.</p>
          </div>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 sm:p-5">
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
            <div className="grid gap-3">
              <label className="grid gap-2 text-sm font-semibold text-slate-600">
                Педагог
                <select value={draft.selectedTeacher} onChange={(event) => update({ selectedTeacher: event.target.value })} className="focus-ring rounded-[8px] border border-line bg-white px-3 py-3 text-ink">
                  {teacherOptions.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-600">Классы педагога</p>
                  <span className="rounded-[8px] bg-mist px-2 py-1 text-xs font-semibold text-slate-500">
                    {formatClassSelection(normalizeSelectedClasses(draft.selectedClasses, draft.selectedClass, classOptions))}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {classGroupButtons.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => selectTeacherGroup(item)}
                      className="rounded-[8px] border border-line bg-white px-2 py-2 text-xs font-semibold text-slate-600 transition hover:-translate-y-0.5 hover:text-apple"
                    >
                      {item}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={resetTeacherClasses}
                    className="rounded-[8px] border border-line bg-white px-2 py-2 text-xs font-semibold text-slate-600 transition hover:-translate-y-0.5 hover:text-coral"
                  >
                    Сбросить
                  </button>
                </div>
                <div className="grid max-h-32 grid-cols-3 gap-2 overflow-y-auto rounded-[8px] border border-line bg-mist p-2 sm:max-h-36">
                  {classOptions.map((item) => {
                    const selectedClasses = normalizeSelectedClasses(draft.selectedClasses, draft.selectedClass, classOptions);
                    const selected = selectedClasses.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleTeacherClass(item)}
                        className={`rounded-[8px] border px-2 py-2 text-sm font-semibold transition ${selected ? "border-apple bg-white text-apple shadow-sm" : "border-line bg-white text-slate-600 hover:-translate-y-0.5"}`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <label className="grid gap-2 text-sm font-semibold text-slate-600">
              Класс
              <select value={draft.selectedClass} onChange={(event) => update({ selectedClass: event.target.value, groupName: event.target.value })} className="focus-ring rounded-[8px] border border-line bg-white px-3 py-3 text-ink">
                {classOptions.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          )}

        </div>

        <div className="shrink-0 border-t border-line/70 bg-white/95 p-3 sm:p-4">
          <button onClick={finish} className="focus-ring flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-ink px-5 font-semibold text-white">
            <Check size={18} />
            Продолжить
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
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

function formatClassSelection(classes: string[]) {
  const unique = Array.from(new Set(classes.filter(Boolean)));
  return unique.length > 6 ? `${unique.length} классов выбрано` : unique.join(", ");
}
