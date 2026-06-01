"use client";

import { classes, teacherNames } from "@/lib/mock-data";
import { defaultPreferences, preferencesStorageKey } from "@/lib/storage";
import type { UserPreferences } from "@/lib/types";
import { Moon, Star, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { SelectField } from "./selectors";

const sections = ["Новости", "Расписание", "Рейтинг", "Мероприятия", "PRo46", "Заявки"];

export function UserPreferencesPanel() {
  const [prefs, setPrefs] = useState<UserPreferences>(defaultPreferences);

  useEffect(() => {
    const saved = localStorage.getItem(preferencesStorageKey);
    if (saved) setPrefs({ ...defaultPreferences, ...JSON.parse(saved) });
  }, []);

  useEffect(() => {
    localStorage.setItem(preferencesStorageKey, JSON.stringify(prefs));
    document.documentElement.dataset.theme = prefs.theme;
    document.documentElement.dataset.design = prefs.design;
    document.documentElement.dataset.rtx = String(prefs.rtx4k);
  }, [prefs]);

  function update(value: Partial<UserPreferences>) {
    setPrefs((current) => ({ ...current, ...value }));
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
        <SelectField label="Класс" value={prefs.selectedClass} options={classes} onChange={(value) => update({ selectedClass: value })} />
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
