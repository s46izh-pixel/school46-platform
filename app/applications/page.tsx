import { PageHero, PageShell } from "@/components/page-shell";
import Link from "next/link";

export default function ApplicationsPage() {
  return (
    <PageShell>
      <PageHero eyebrow="Заявки" title="Выберите событие" text="Заявка всегда принадлежит конкретному конкурсу, акции или мероприятию. Откройте нужную карточку события и нажмите кнопку подачи заявки." />
      <section className="mx-auto max-w-4xl px-4 pb-12 sm:px-6 lg:px-8">
        <Link href="/events" className="inline-flex rounded-[8px] bg-ink px-5 py-3 font-semibold text-white">
          Перейти к событиям
        </Link>
      </section>
    </PageShell>
  );
}
