"use client";

import { defaultPreferences, preferencesStorageKey } from "@/lib/storage";
import type { UserPreferences } from "@/lib/types";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const dailyWishes = [
  { wish: "Пусть сегодня получится сделать хотя бы один шаг вперёд.", quote: "«Знание — сила». Ф. Бэкон" },
  { wish: "Спокойствия, внимания и хороших людей рядом.", quote: "«Всё течёт». Гераклит" },
  { wish: "Пусть сложное сегодня станет понятным.", quote: "«Мыслю, следовательно существую». Р. Декарт" },
  { wish: "Хорошего темпа: без суеты, но с результатом.", quote: "«Порядок учит беречь время». И. Гёте" },
  { wish: "Пусть день принесёт маленькую победу.", quote: "«Дорогу осилит идущий». Сенека" },
  { wish: "Больше ясности в задачах и радости в переменах.", quote: "«Учиться никогда не поздно». Квинтилиан" },
  { wish: "Пусть сегодня будет повод собой гордиться.", quote: "«Начало — половина дела». Аристотель" }
];

export function HomeGreeting() {
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
  const classText = prefs.selectedClass ? `Ваш класс: ${prefs.selectedClass}` : "Цифровая платформа";
  const dailyWish = dailyWishes[getDayOfYear() % dailyWishes.length];

  return (
    <div className="mb-4 grid w-fit max-w-2xl gap-2">
      <p className="inline-flex w-fit items-center gap-2 rounded-[8px] bg-white px-3 py-2 text-sm font-semibold text-apple shadow-sm">
        <Sparkles size={16} />
        <span>{greeting}</span>
        <span className="text-slate-400">·</span>
        <span className="text-slate-600">{classText}</span>
      </p>
      <p className="rounded-[8px] bg-[var(--accent-soft)] px-3 py-2 text-sm leading-6 text-slate-700">
        {dailyWish.wish} <span className="font-semibold text-ink">{dailyWish.quote}</span>
      </p>
    </div>
  );
}

function getDayOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86400000);
}
