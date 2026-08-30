"use client";

import { classes, teacherNames } from "@/lib/mock-data";
import { uniqueClasses } from "@/lib/class-utils";
import { defaultPreferences, preferencesStorageKey } from "@/lib/storage";
import type { ScheduleLesson, UserPreferences } from "@/lib/types";
import { Moon, Star, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { SelectField } from "./selectors";

const sections = ["Новости", "Расписание", "Рейтинг", "Мероприятия", "PRo46", "Заявки"];
const classGroupButtons = ["1-4 классы", "5-8 классы", "9-11 классы", "Все классы"];

export function UserPreferencesPanel() {
  const [prefs, setPrefs] = useState<UserPreferences>(defaultPreferences);
  const [mounted, setMounted] = useState(false);
  const [classOptions, setClassOptions] = useState(() => uniqueClasses(classes, classes));

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(preferencesStorageKey);
    if (saved) setPrefs({ ...defaultPreferences, ...JSON.parse(saved) });
    fetch("/api/schedule", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { lessons?: ScheduleLesson[] }) => {
        const nextOptions = uniqueClasses(data.lessons?.map((lesson) => lesson.className) ?? [], classes);
        setClassOptions(nextOptions);
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

  function update(value: Partial<UserPreferences>) {
    setPrefs((current) => ({ ...current, ...value }));
  }

  function updateClass(value: string) {
    update({ selectedClass: value, selectedClasses: [value], groupName: value });
  }

  function toggleTeacherClass(className: string) {
    setPrefs((current) => {
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
    setPrefs((current) => {
      const selectedClasses = getClassesByGroup(group, classOptions);
      const safeClasses = selectedClasses.length ? selectedClasses : normalizeSelectedClasses(current.selectedClasses, current.selectedClass, classOptions);
      return { ...current, selectedClass: safeClasses[0] ?? current.selectedClass, selectedClasses: safeClasses, groupName: safeClasses.join(", ") };
    });
  }

  function resetTeacherClasses() {
    setPrefs((current) => {
      const safeClass = classOptions.includes(current.selectedClass) ? current.selectedClass : classOptions[0];
      return { ...current, selectedClass: safeClass, selectedClasses: [safeClass], groupName: safeClass };
    });
  }

  function toggleSection(section: string) {
    const exists = prefs.favoriteSections.includes(section);
    update({
      favoriteSections: exists
        ? prefs.favoriteSections.filter((item) => item !== section)
        : [...prefs.favoriteSections, section]
    });
  }

  return (
    <div className="grid gap-4 rounded-[8px] border border-line bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-apple">Персональная лента</p>
          <h3 className="text-xl font-semibold text-ink">Мои настройки</h3>
        </div>
        <div className="flex rounded-[8px] bg-mist p-1">
          <button onClick={() => update({ theme: "light" })} className={`rounded-[8px] p-2 ${prefs.theme === "light" ? "bg-white text-apple shadow-sm" : "text-slate-500"}`} aria-label="Светлая тема">
            <Sun size={18} />
          </button>
          <button onClick={() => update({ theme: "dark" })} className={`rounded-[8px] p-2 ${prefs.theme === "dark" ? "bg-ink text-white shadow-sm" : "text-slate-500"}`} aria-label="Темная тема">
            <Moon size={18} />
          </button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {prefs.role === "teacher" ? (
          <div className="grid gap-2 sm:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-600">Классы педагога</p>
              <span className="rounded-[8px] bg-mist px-2 py-1 text-xs font-semibold text-slate-500">
                {formatClassSelection(normalizeSelectedClasses(prefs.selectedClasses, prefs.selectedClass, classOptions))}
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
            <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-[8px] border border-line bg-mist p-2">
              {classOptions.map((item) => {
                const selectedClasses = normalizeSelectedClasses(prefs.selectedClasses, prefs.selectedClass, classOptions);
                const selected = selectedClasses.includes(item);
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
          <SelectField label="Класс" value={prefs.selectedClass} options={classOptions} onChange={updateClass} />
        )}
        <SelectField label="Педагог" value={prefs.selectedTeacher} options={teacherNames} onChange={(value) => update({ selectedTeacher: value })} />
      </div>
      <div className="grid gap-2">
        <p className="text-sm font-semibold text-slate-600">Любимые разделы</p>
        <div className="flex flex-wrap gap-2">
          {sections.map((section) => (
            <button
              key={section}
              onClick={() => toggleSection(section)}
              className={`flex items-center gap-2 rounded-[8px] px-3 py-2 text-sm font-semibold transition ${prefs.favoriteSections.includes(section) ? "bg-apple text-white" : "bg-mist text-slate-600"}`}
            >
              <Star size={15} />
              {section}
            </button>
          ))}
        </div>
      </div>
    </div>
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
