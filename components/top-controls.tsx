"use client";

import { classes } from "@/lib/mock-data";
import { defaultPreferences, preferencesStorageKey } from "@/lib/storage";
import type { UserPreferences } from "@/lib/types";
import { BarChart3, Moon, Settings, Sun, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const designs: Array<{ id: UserPreferences["design"]; title: string }> = [
  { id: "silver", title: "Серебро" },
  { id: "classic", title: "Классика" },
  { id: "sky", title: "Небо" },
  { id: "mint", title: "Мята" },
  { id: "sakura", title: "Сакура" },
  { id: "graphite", title: "Графит" },
  { id: "aurora", title: "Аврора" }
];

const usefulLinks = [
  { href: "/pro46", label: "PRo46" },
  { href: "/teachers", label: "Учителям" },
  { href: "/contacts", label: "Контакты" },
  { href: "/bot", label: "Школьный бот" }
];

export function TopControls() {
  const [open, setOpen] = useState(false);
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

      {open ? (
        <div className="fixed inset-0 z-[80] bg-ink/30 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <aside
            className="glass ml-auto h-full w-full max-w-md overflow-y-auto p-5 shadow-soft"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-apple">Настройки</p>
                <h2 className="text-2xl font-semibold text-ink">Быстрый профиль</h2>
              </div>
              <button onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-[8px] bg-mist text-ink">
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
                      onClick={() => update({ design: design.id })}
                      className={`rounded-[8px] border px-3 py-3 text-sm font-semibold transition hover:-translate-y-0.5 ${prefs.design === design.id ? "border-apple bg-blue-50 text-apple" : "border-line bg-white text-slate-600"}`}
                    >
                      {design.title}
                    </button>
                  ))}
                </div>
              </section>

              <section className="grid gap-3">
                <h3 className="font-semibold text-ink">Добровольный профиль</h3>
                <input value={prefs.userName} onChange={(event) => update({ userName: event.target.value })} placeholder="Имя пользователя" className="focus-ring rounded-[8px] border border-line bg-white px-3 py-2" />
                <select value={prefs.groupName} onChange={(event) => update({ groupName: event.target.value, selectedClass: event.target.value })} className="focus-ring rounded-[8px] border border-line bg-white px-3 py-2">
                  {classes.map((item) => <option key={item}>{item}</option>)}
                </select>
              </section>

              <section className="rounded-[8px] border border-line bg-white p-4">
                <label className="flex items-center justify-between gap-4">
                  <span>
                    <span className="block font-semibold text-ink">RTX 4K</span>
                    <span className="block text-sm leading-6 text-slate-500">Усиленный blur, сетка и мягкое свечение.</span>
                  </span>
                  <input type="checkbox" checked={prefs.rtx4k} onChange={(event) => update({ rtx4k: event.target.checked })} />
                </label>
              </section>

              <section className="rounded-[8px] border border-line bg-white p-4">
                <h3 className="font-semibold text-ink">Google Таблицы</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Если таблицы недоступны или нет ключей доступа, API автоматически использует демо-режим.
                </p>
              </section>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
