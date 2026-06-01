import { PageHero, PageShell } from "@/components/page-shell";

export default function BotPage() {
  return (
    <PageShell>
      <PageHero eyebrow="Бот" title="Школьный помощник" text="Здесь появится подключение к боту для быстрых ответов по расписанию, событиям и заявкам." />
      <section className="mx-auto max-w-4xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="rounded-[8px] border border-line bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-ink">Сценарии бота</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">Расписание класса, ближайшие события, статус заявки и ссылки на школьные разделы.</p>
        </div>
      </section>
    </PageShell>
  );
}
