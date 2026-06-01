"use client";

import { actions, classes } from "@/lib/mock-data";
import { EventItem } from "@/lib/types";
import { CheckCircle2, Send } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";

export function ApplicationForm({ event: selectedEvent }: { event?: EventItem }) {
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...Object.fromEntries(form.entries()),
        applicationId: crypto.randomUUID(),
        eventId: selectedEvent?.id ?? "",
        eventTitle: selectedEvent?.title ?? form.get("contest"),
        eventType: selectedEvent?.type ?? "contest",
        createdAt: new Date().toISOString()
      })
    });
    setSent(true);
    event.currentTarget.reset();
  }

  if (sent) {
    return (
      <div className="rounded-[8px] border border-mint/30 bg-emerald-50 p-6 text-emerald-900">
        <CheckCircle2 className="mb-3" size={32} />
        <h2 className="text-2xl font-semibold">Заявка отправлена</h2>
        <p className="mt-2 text-sm leading-6">Мы записали заявку через серверный API в mock-режиме. При подключении Google Sheets она будет попадать в таблицу.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-[8px] border border-line bg-white p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2">
        {selectedEvent ? (
          <input type="hidden" name="contest" value={selectedEvent.title} />
        ) : (
          <Field as="select" name="contest" label="Конкурс" options={actions.map((item) => item.title)} />
        )}
        <Field as="select" name="className" label="Класс" options={classes} />
        <Field name="student" label="ФИО участника" />
        <Field name="mentor" label="ФИО руководителя" />
        <Field name="nomination" label="Номинация" />
        <Field name="contact" label="Контакт" />
        <Field name="workUrl" label="Ссылка на работу" />
      </div>
      <label className="grid gap-2 text-sm font-medium text-slate-600">
        Комментарий
        <textarea name="comment" rows={4} className="focus-ring rounded-[8px] border border-line px-3 py-2" />
      </label>
      <label className="flex items-start gap-3 text-sm text-slate-600">
        <input required name="consent" type="checkbox" className="mt-1" />
        Даю согласие на обработку данных для участия в конкурсе
      </label>
      <button className="focus-ring flex items-center justify-center gap-2 rounded-[8px] bg-ink px-5 py-3 font-semibold text-white">
        <Send size={18} />
        Отправить заявку
      </button>
    </form>
  );
}

function Field({ label, name, as, options }: { label: string; name: string; as?: "select"; options?: string[] }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-600">
      {label}
      {as === "select" ? (
        <select name={name} className="focus-ring rounded-[8px] border border-line bg-white px-3 py-2">
          {options?.map((item) => <option key={item}>{item}</option>)}
        </select>
      ) : (
        <input required name={name} className="focus-ring rounded-[8px] border border-line px-3 py-2" />
      )}
    </label>
  );
}
