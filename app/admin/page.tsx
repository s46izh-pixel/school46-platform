"use client";

import { Card, SectionTitle } from "@/components/card";
import { getAllowedAdminSections, roles, canAccessAdmin } from "@/lib/auth";
import { actions, applications, classes, events, news, rating } from "@/lib/mock-data";
import { hasConfiguredSheets } from "@/lib/sheets-config";
import { roleStorageKey } from "@/lib/storage";
import type { UserRole } from "@/lib/types";
import { CalendarPlus, FilePenLine, Lock, Newspaper, Settings, ShieldCheck, Trophy, Users } from "lucide-react";
import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

export default function AdminPage() {
  const [role, setRole] = useState<UserRole>("admin");
  const [active, setActive] = useState("Dashboard");
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");

  const allowedTabs = useMemo(() => getAllowedAdminSections(role), [role]);

  useEffect(() => {
    const savedRole = (localStorage.getItem(roleStorageKey) as UserRole | null) ?? "admin";
    setRole(savedRole);
    setUnlocked(localStorage.getItem("school46.admin") === "ok");
  }, []);

  useEffect(() => {
    localStorage.setItem(roleStorageKey, role);
    const allowed = getAllowedAdminSections(role);
    if (!allowed.includes(active)) setActive(allowed[0] ?? "Dashboard");
  }, [active, role]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (password === "school46") {
      localStorage.setItem("school46.admin", "ok");
      setUnlocked(true);
    }
  }

  if (!unlocked) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <Card className="w-full max-w-md">
          <Lock className="mb-4 text-apple" size={32} />
          <h1 className="text-2xl font-semibold">Вход в админ-панель</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Mock-auth для первого этапа. Пароль по умолчанию: school46.</p>
          <form onSubmit={submit} className="mt-6 grid gap-3">
            <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Пароль" type="password" className="focus-ring rounded-[8px] border border-line px-3 py-3" />
            <button className="focus-ring rounded-[8px] bg-ink px-4 py-3 font-semibold text-white">Войти</button>
            <Link href="/" className="text-center text-sm font-semibold text-apple">На главную</Link>
          </form>
        </Card>
      </main>
    );
  }

  if (!canAccessAdmin(role)) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <Card className="max-w-lg bg-white text-center">
          <Lock className="mx-auto mb-4 text-coral" size={34} />
          <h1 className="text-2xl font-semibold">У роли viewer нет доступа в админку</h1>
          <p className="mt-2 text-sm text-slate-600">Переключите роль для демонстрации прав доступа.</p>
          <RoleSwitcher role={role} setRole={setRole} />
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-mist">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-apple">Школа №46</p>
            <h1 className="text-3xl font-semibold text-ink">Панель управления</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <RoleSwitcher role={role} setRole={setRole} />
            <Link href="/" className="rounded-[8px] bg-white px-4 py-2 text-sm font-semibold text-ink shadow-sm">Открыть сайт</Link>
          </div>
        </header>

        <div className="mb-6 flex gap-2 overflow-x-auto rounded-[8px] bg-white p-2">
          {allowedTabs.map((tab) => (
            <button key={tab} onClick={() => setActive(tab)} className={`rounded-[8px] px-4 py-2 text-sm font-semibold transition ${active === tab ? "bg-ink text-white" : "text-slate-600 hover:bg-mist"}`}>
              {tab}
            </button>
          ))}
        </div>

        <Card className="bg-white">
          {active === "Dashboard" ? <Dashboard /> : null}
          {active === "Новости" ? <NewsEditor role={role} /> : null}
          {active === "Мероприятия" ? <EventsEditor title="Мероприятия" /> : null}
          {active === "Акции" ? <EventsEditor title="Акции" isAction /> : null}
          {active === "Заявки" ? <ApplicationsTable /> : null}
          {active === "Рейтинг" ? <RatingPreview /> : null}
          {active === "Расписание" ? <SchedulePreview /> : null}
          {active === "Настройки" ? <SettingsPanel /> : null}
          {active === "Пользователи и роли" ? <RolesPanel /> : null}
        </Card>
      </div>
    </main>
  );
}

function RoleSwitcher({ role, setRole }: { role: UserRole; setRole: (role: UserRole) => void }) {
  return (
    <select value={role} onChange={(event) => setRole(event.target.value as UserRole)} className="focus-ring rounded-[8px] border border-line bg-white px-3 py-2 text-sm font-semibold text-ink">
      {roles.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
    </select>
  );
}

function Dashboard() {
  return (
    <div className="grid gap-6">
      <SectionTitle eyebrow="Dashboard" title="Обзор платформы" />
      <div className="grid gap-4 md:grid-cols-4">
        <Metric icon={<Newspaper />} label="Новости" value={news.length} />
        <Metric icon={<CalendarPlus />} label="Мероприятия" value={events.length} />
        <Metric icon={<FilePenLine />} label="Заявки" value={applications.length} />
        <Metric icon={<Trophy />} label="Классы" value={rating.length} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <AdminList title="Ближайшие события" items={events.map((item) => `${item.date} · ${item.title} · ${item.status}`)} />
        <AdminList title="Последние заявки" items={applications.map((item) => `${item.contest} · ${item.student} · ${item.status}`)} />
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <Card className="bg-white">
      <div className="mb-4 text-apple">{icon}</div>
      <p className="text-3xl font-semibold text-ink">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </Card>
  );
}

function NewsEditor({ role }: { role: UserRole }) {
  const visibleNews = role === "class_teacher" ? news.filter((item) => item.className === "8А" || item.className === "Все") : news;
  return (
    <EditorLayout title="Новости" form={<AdminForm fields={["Заголовок", "Текст", "Обложка", "Рубрика", "Теги", "Автор"]} selectLabel="Класс" statuses={["draft", "published", "archived"]} />} items={visibleNews.map((item) => `${item.date} · ${item.title} · ${item.status}`)} />
  );
}

function EventsEditor({ title, isAction }: { title: string; isAction?: boolean }) {
  const source = isAction ? actions : events;
  return (
    <EditorLayout title={title} form={<AdminForm fields={["Название", "Дата", "Время", "Место", "Описание", "Ответственный"]} selectLabel="Классы-участники" statuses={["planned", "active", "finished"]} />} items={source.map((item) => `${item.date} · ${item.title} · ${item.status}`)} />
  );
}

function ApplicationsTable() {
  const [eventFilter, setEventFilter] = useState("Все");
  const [typeFilter, setTypeFilter] = useState("Все");
  const [classFilter, setClassFilter] = useState("Все");
  const [statusFilter, setStatusFilter] = useState("Все");
  const filtered = applications.filter((item) =>
    (eventFilter === "Все" || item.eventTitle === eventFilter) &&
    (typeFilter === "Все" || item.eventType === typeFilter) &&
    (classFilter === "Все" || item.className === classFilter) &&
    (statusFilter === "Все" || item.status === statusFilter)
  );

  return (
    <div className="grid gap-4">
      <SectionTitle eyebrow="Администрирование" title="Заявки" />
      <div className="grid gap-3 rounded-[8px] bg-mist p-4 md:grid-cols-4">
        <select value={eventFilter} onChange={(event) => setEventFilter(event.target.value)} className="rounded-[8px] border border-line bg-white px-3 py-2">
          {["Все", ...Array.from(new Set(applications.map((item) => item.eventTitle)))].map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="rounded-[8px] border border-line bg-white px-3 py-2">
          {["Все", "event", "contest", "action"].map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} className="rounded-[8px] border border-line bg-white px-3 py-2">
          {["Все", ...classes].map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-[8px] border border-line bg-white px-3 py-2">
          {["Все", "new", "accepted", "revision", "rejected", "sent"].map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      <AdminList title="Все заявки" items={filtered.map((item) => `${item.eventTitle} · ${item.student} · ${item.className} · ${item.status}`)} />
    </div>
  );
}

function RatingPreview() {
  return <AdminList title="Рейтинг классов" items={rating.map((item) => `${item.place}. ${item.className} · ${item.points} баллов · ${item.comment}`)} />;
}

function SchedulePreview() {
  return <AdminList title="Расписание" items={["Расписание уроков читается из листа Google Sheets", "Расписание педагогов доступно отдельным листом", "Расписание звонков выводится публично"]} />;
}

function SettingsPanel() {
  const googleStatus = hasConfiguredSheets()
    ? "Google Таблицы подключены"
    : "Google Таблицы не подключены — используется демо-режим";
  return <AdminList title="Настройки" items={[googleStatus, "ID таблиц и названия листов вынесены в lib/sheets-config.ts", "Пароль админки можно заменить переменной окружения", "Mock-режим остается активным без ключей Google"]} icon={<Settings />} />;
}

function RolesPanel() {
  return <AdminList title="Пользователи и роли" items={roles.map((item) => `${item.title} · ${item.description}`)} icon={<Users />} />;
}

function EditorLayout({ title, form, items }: { title: string; form: ReactNode; items: string[] }) {
  return (
    <div>
      <SectionTitle eyebrow="Редактирование" title={title} />
      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        {form}
        <AdminList title="Записи" items={items} />
      </div>
    </div>
  );
}

function AdminForm({ fields, selectLabel, statuses }: { fields: string[]; selectLabel: string; statuses: string[] }) {
  return (
    <form className="grid gap-3 rounded-[8px] bg-mist p-4">
      {fields.map((field) => <input key={field} placeholder={field} className="focus-ring rounded-[8px] border border-line bg-white px-3 py-2" />)}
      <select className="focus-ring rounded-[8px] border border-line bg-white px-3 py-2">
        <option>{selectLabel}</option>
        {classes.map((className) => <option key={className}>{className}</option>)}
      </select>
      <select className="focus-ring rounded-[8px] border border-line bg-white px-3 py-2">
        {statuses.map((status) => <option key={status}>{status}</option>)}
      </select>
      {statuses.includes("planned") ? (
        <div className="grid gap-3 rounded-[8px] border border-line bg-white p-3">
          <p className="font-semibold text-ink">Заявки</p>
          <label className="flex items-center justify-between gap-3 text-sm text-slate-600">
            Принимать заявки
            <input type="checkbox" />
          </label>
          <input type="date" className="focus-ring rounded-[8px] border border-line bg-white px-3 py-2" />
          <input placeholder="Поля заявки: student,className,mentor,contact" className="focus-ring rounded-[8px] border border-line bg-white px-3 py-2" />
          <input placeholder="Текст кнопки: Подать заявку" className="focus-ring rounded-[8px] border border-line bg-white px-3 py-2" />
        </div>
      ) : null}
      <button type="button" className="focus-ring flex items-center justify-center gap-2 rounded-[8px] bg-ink px-4 py-3 font-semibold text-white">
        <ShieldCheck size={18} />
        Сохранить в таблицу
      </button>
    </form>
  );
}

function AdminList({ title, items, icon }: { title: string; items: string[]; icon?: ReactNode }) {
  return (
    <div className="rounded-[8px] border border-line bg-white p-4">
      <h3 className="mb-3 flex items-center gap-2 font-semibold text-ink">{icon}{title}</h3>
      <div className="grid gap-2">
        {items.map((item) => (
          <div key={item} className="flex items-center justify-between gap-3 rounded-[8px] border border-line bg-white px-4 py-3 text-sm">
            <span>{item}</span>
            <button className="rounded-[8px] bg-mist px-3 py-2 font-semibold text-slate-600">Изменить</button>
          </div>
        ))}
      </div>
    </div>
  );
}
