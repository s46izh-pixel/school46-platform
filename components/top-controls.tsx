"use client";

import { classes } from "@/lib/mock-data";
import { defaultPreferences, preferencesStorageKey } from "@/lib/storage";
import { uniqueClasses } from "@/lib/class-utils";
import type { ScheduleLesson, UserPreferences } from "@/lib/types";
import { BarChart3, Check, Moon, Settings, Sun, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const designs: Array<{ id: UserPreferences["design"]; title: string }> = [
  { id: "silver", title: "Серебро" },
  { id: "classic", title: "Классика" },
  { id: "sky", title: "Небо" },
  { id: "mint", title: "Мята" },
  { id: "sakura", title: "Сакура" },
  { id: "graphite", title: "Графит" },
  { id: "aurora", title: "Аврора" },
  { id: "school", title: "Школа+" },
  { id: "space", title: "Космос" }
];

const roles: Array<{ id: UserPreferences["role"]; title: string }> = [
  { id: "student", title: "Ученик" },
  { id: "teacher", title: "Педагог" },
  { id: "parent", title: "Родитель" }
];

const usefulLinks = [
  { href: "/pro46", label: "PRo46" },
  { href: "/contacts", label: "Контакты" }
];

export function TopControls() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [prefs, setPrefs] = useState<UserPreferences>(defaultPreferences);
  const [draftPrefs, setDraftPrefs] = useState<UserPreferences>(defaultPreferences);
  const [classOptions, setClassOptions] = useState(() => uniqueClasses(classes, classes));
  const [teacherOptions, setTeacherOptions] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(preferencesStorageKey);
    const savedClass = localStorage.getItem("school46.class");
    if (saved) {
      const parsed = normalizePreferences({ ...defaultPreferences, ...JSON.parse(saved) }, savedClass);
      const nextPrefs = { ...parsed, selectedClass: savedClass ?? parsed.selectedClass, groupName: savedClass ?? parsed.groupName };
      setPrefs(nextPrefs);
      setDraftPrefs(nextPrefs);
    } else if (savedClass) {
      setPrefs((current) => {
        const nextPrefs = normalizePreferences({ ...current, selectedClass: savedClass, groupName: savedClass }, savedClass);
        setDraftPrefs(nextPrefs);
        return nextPrefs;
      });
    }

    fetch("/api/schedule", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { lessons?: ScheduleLesson[] }) => {
        const nextOptions = uniqueClasses(data.lessons?.map((lesson) => lesson.className) ?? [], classes);
        const nextTeachers = Array.from(new Set(data.lessons?.map((lesson) => lesson.teacher.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ru"));
        setClassOptions(nextOptions);
        setTeacherOptions(nextTeachers);
        setPrefs((current) => {
          const selectedClass = nextOptions.includes(current.selectedClass) ? current.selectedClass : nextOptions[0] ?? current.selectedClass;
          const selectedTeacher = nextTeachers.includes(current.selectedTeacher) ? current.selectedTeacher : nextTeachers[0] ?? current.selectedTeacher;
          const selectedClasses = normalizeSelectedClasses(current.selectedClasses, selectedClass, nextOptions);
          const nextPrefs = { ...current, selectedClass, selectedClasses, groupName: selectedClasses.join(", "), selectedTeacher };
          setDraftPrefs(nextPrefs);
          return nextPrefs;
        });
      })
      .catch(() => setClassOptions(uniqueClasses(classes, classes)));
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(preferencesStorageKey, JSON.stringify(prefs));
    localStorage.setItem("school46.class", prefs.selectedClass);
    document.documentElement.dataset.theme = prefs.theme;
    document.documentElement.dataset.design = prefs.design;
    document.documentElement.removeAttribute("data-rtx");
    window.dispatchEvent(new CustomEvent("school46.preferences-updated", { detail: prefs }));
  }, [mounted, prefs]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    if (open) setDraftPrefs(prefs);
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  function update(value: Partial<UserPreferences>) {
    setPrefs((current) => ({ ...current, ...value }));
  }

  function updateDraft(value: Partial<UserPreferences>) {
    setSaved(false);
    setDraftPrefs((current) => ({ ...current, ...value }));
  }

  function updateDraftClass(value: string) {
    updateDraft({ selectedClass: value, selectedClasses: [value], groupName: value });
  }

  function updateDraftRole(role: UserPreferences["role"]) {
    updateDraft({
      role,
      selectedClasses: role === "teacher" ? normalizeSelectedClasses(draftPrefs.selectedClasses, draftPrefs.selectedClass, classOptions) : [draftPrefs.selectedClass],
      groupName: draftPrefs.selectedClass
    });
  }

  function toggleDraftTeacherClass(className: string) {
    setSaved(false);
    setDraftPrefs((current) => {
      const currentClasses = normalizeSelectedClasses(current.selectedClasses, current.selectedClass, classOptions);
      const exists = currentClasses.includes(className);
      const selectedClasses = exists
        ? currentClasses.filter((item) => item !== className)
        : currentClasses.length >= 3
          ? currentClasses
          : [...currentClasses, className];
      const safeClasses = selectedClasses.length ? selectedClasses : [className];
      return {
        ...current,
        selectedClass: safeClasses[0],
        selectedClasses: safeClasses,
        groupName: safeClasses.join(", ")
      };
    });
  }

  function saveSettings() {
    setPrefs(normalizePreferences(draftPrefs));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  return (
    <>
      <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
        <button
          onClick={() => update({ theme: prefs.theme === "light" ? "dark" : "light" })}
          className="focus-ring flex h-10 items-center justify-center gap-2 rounded-[8px] border border-line bg-white px-3 text-ink shadow-sm transition hover:-translate-y-0.5"
          aria-label="Переключить тему"
        >
          {prefs.theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          <span className="hidden text-sm font-semibold xl:inline">Тема</span>
        </button>
        <Link
          href="/rating"
          className="focus-ring flex h-10 items-center justify-center gap-2 rounded-[8px] border border-line bg-white px-3 text-ink shadow-sm transition hover:-translate-y-0.5"
          aria-label="Открыть рейтинг"
        >
          <BarChart3 size={18} />
          <span className="hidden text-sm font-semibold xl:inline">Рейтинг</span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          className="focus-ring flex h-10 items-center justify-center gap-2 rounded-[8px] bg-ink px-3 text-white shadow-sm transition hover:-translate-y-0.5"
          aria-label="Открыть настройки"
        >
          <Settings size={18} />
          <span className="hidden text-sm font-semibold xl:inline">Настройки</span>
        </button>
      </div>

      {mounted && open ? createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-950/30 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <aside
            className="settings-panel ml-auto flex h-dvh w-full max-w-[420px] flex-col overflow-y-auto border-l border-white/70 bg-white/95 p-5 shadow-soft backdrop-blur-2xl"
            aria-label="Панель настроек"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-apple">Настройки</p>
                <h2 className="text-2xl font-semibold text-ink">Быстрый профиль</h2>
              </div>
              <button onClick={() => setOpen(false)} className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-[8px] bg-mist text-ink" aria-label="Закрыть настройки">
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-5">
              <section className="rounded-[8px] border border-line bg-white p-4">
                <h3 className="font-semibold text-ink">Полезные ссылки</h3>
                <div className="mt-3 grid gap-2">
                  {usefulLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="focus-ring rounded-[8px] bg-mist px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-ink"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="mb-3 font-semibold text-ink">Дизайн интерфейса</h3>
                <div className="grid grid-cols-2 gap-2">
                  {designs.map((design) => (
                    <button
                      key={design.id}
                      onClick={() => updateDraft({ design: design.id })}
                      className={`rounded-[8px] border px-3 py-3 text-sm font-semibold transition hover:-translate-y-0.5 ${draftPrefs.design === design.id ? "border-apple bg-[var(--accent-soft)] text-apple" : "border-line bg-white text-slate-600"}`}
                    >
                      {design.title}
                    </button>
                  ))}
                </div>
              </section>

              <section className="grid gap-3 rounded-[8px] border border-line bg-white p-4">
                <h3 className="font-semibold text-ink">Добровольный профиль</h3>
                <input value={draftPrefs.userName} onChange={(event) => updateDraft({ userName: event.target.value })} placeholder="Имя пользователя" className="focus-ring rounded-[8px] border border-line bg-white px-3 py-2" />
                <div className="grid grid-cols-3 gap-2">
                  {roles.map((role) => (
                    <button
                      key={role.id}
                      onClick={() => updateDraftRole(role.id)}
                      className={`rounded-[8px] border px-2 py-2 text-sm font-semibold ${draftPrefs.role === role.id ? "border-apple bg-[var(--accent-soft)] text-apple" : "border-line bg-white text-slate-600"}`}
                    >
                      {role.title}
                    </button>
                  ))}
                </div>
                {draftPrefs.role === "teacher" ? (
                  <div className="grid gap-2">
                    <p className="text-xs font-semibold text-slate-500">Классы педагога · до 3</p>
                    <div className="grid max-h-44 grid-cols-3 gap-2 overflow-y-auto rounded-[8px] border border-line bg-mist p-2">
                      {classOptions.map((item) => {
                        const selected = normalizeSelectedClasses(draftPrefs.selectedClasses, draftPrefs.selectedClass, classOptions).includes(item);
                        const disabled = !selected && normalizeSelectedClasses(draftPrefs.selectedClasses, draftPrefs.selectedClass, classOptions).length >= 3;
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => toggleDraftTeacherClass(item)}
                            disabled={disabled}
                            className={`rounded-[8px] border px-2 py-2 text-sm font-semibold transition ${selected ? "border-apple bg-white text-apple shadow-sm" : "border-line bg-white text-slate-600"} ${disabled ? "cursor-not-allowed opacity-45" : "hover:-translate-y-0.5"}`}
                          >
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <label className="grid gap-1 text-xs font-semibold text-slate-500">
                    Класс
                    <select value={draftPrefs.selectedClass} onChange={(event) => updateDraftClass(event.target.value)} className="focus-ring rounded-[8px] border border-line bg-white px-3 py-2 text-sm text-ink">
                      {classOptions.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                )}
                {draftPrefs.role === "teacher" ? (
                  <label className="grid gap-1 text-xs font-semibold text-slate-500">
                    Педагог
                    <select value={draftPrefs.selectedTeacher} onChange={(event) => updateDraft({ selectedTeacher: event.target.value })} className="focus-ring rounded-[8px] border border-line bg-white px-3 py-2 text-sm text-ink">
                      {teacherOptions.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                ) : null}
                <p className="text-xs leading-5 text-slate-500">Если выбрали не то, это всегда можно поменять здесь.</p>
              </section>

              <button onClick={saveSettings} className="focus-ring flex h-11 items-center justify-center gap-2 rounded-[8px] bg-ink px-4 text-sm font-semibold text-white">
                <Check size={17} />
                {saved ? "Сохранено" : "Сохранить"}
              </button>
            </div>
          </aside>
        </div>,
        document.body
      ) : null}
    </>
  );
}

function normalizePreferences(preferences: UserPreferences, savedClass?: string | null): UserPreferences {
  const selectedClass = savedClass ?? preferences.selectedClass;
  const selectedClasses = normalizeSelectedClasses(preferences.selectedClasses, selectedClass);
  return {
    ...preferences,
    selectedClass: selectedClasses[0] ?? selectedClass,
    selectedClasses,
    groupName: preferences.role === "teacher" ? selectedClasses.join(", ") : selectedClass
  };
}

function normalizeSelectedClasses(selectedClasses: string[] | undefined, selectedClass: string, options?: string[]) {
  const source = selectedClasses?.length ? selectedClasses : [selectedClass];
  const filtered = source.filter((item) => !options || options.includes(item));
  const unique = Array.from(new Set(filtered.length ? filtered : [selectedClass])).slice(0, 3);
  return unique.length ? unique : [selectedClass];
}
