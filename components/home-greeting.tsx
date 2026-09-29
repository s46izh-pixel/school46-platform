"use client";

import { defaultPreferences, preferencesStorageKey } from "@/lib/storage";
import type { UserPreferences } from "@/lib/types";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const dailyWishes = [
  "Пусть сегодня получится сделать хотя бы один шаг вперёд.",
  "Спокойствия, внимания и хороших людей рядом.",
  "Пусть сложное сегодня станет понятным.",
  "Хорошего темпа: без суеты, но с результатом.",
  "Пусть день принесёт маленькую победу.",
  "Больше ясности в задачах и радости в переменах.",
  "Пусть сегодня будет повод собой гордиться."
];
const fallbackQuote = "«Начало — половина дела». — Аристотель";

export function HomeGreeting({ quotes = [] }: { quotes?: string[] }) {
  const [prefs, setPrefs] = useState<UserPreferences>(defaultPreferences);

  useEffect(() => {
    function loadPreferences() {
      const saved = localStorage.getItem(preferencesStorageKey);
      const next = saved ? { ...defaultPreferences, ...JSON.parse(saved) } : defaultPreferences;
      setPrefs(next);
    }
    loadPreferences();
    window.addEventListener("school46.preferences-updated", loadPreferences);
    return () => window.removeEventListener("school46.preferences-updated", loadPreferences);
  }, []);

  const name = prefs.userName.trim();
  const greeting = name ? `Здравствуйте, ${name}` : "Школа №46 онлайн";
  const selectedClasses = prefs.role === "teacher" && prefs.selectedClasses?.length ? prefs.selectedClasses : [prefs.selectedClass];
  const classText = selectedClasses.length ? `Ваши классы: ${formatClassSelection(selectedClasses)}` : "Цифровая платформа";
  const dayIndex = getDayOfYear();
  const dailyWish = dailyWishes[dayIndex % dailyWishes.length];
  const dailyQuote = quotes.length ? quotes[dayIndex % quotes.length] : fallbackQuote;

  return (
    <div className="mb-4 grid w-fit max-w-2xl gap-2">
      <p className="inline-flex w-fit items-center gap-2 rounded-[8px] bg-white px-3 py-2 text-sm font-semibold text-apple shadow-sm">
        <Sparkles size={16} />
        <span>{greeting}</span>
        <span className="text-slate-400">·</span>
        <span className="text-slate-600">{classText}</span>
      </p>
      <p className="rounded-[8px] bg-[var(--accent-soft)] px-3 py-2 text-sm leading-6 text-slate-700">
        {dailyWish} <span className="font-semibold text-ink">{dailyQuote}</span>
      </p>
    </div>
  );
}

function getDayOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86400000);
}

function formatClassSelection(classes: string[]) {
  const unique = Array.from(new Set(classes.filter(Boolean)));
  return unique.length > 6 ? `${unique.length} классов выбрано` : unique.join(", ");
}
