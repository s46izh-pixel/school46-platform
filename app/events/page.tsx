import { CalendarView } from "@/components/calendar-view";
import { PageHero, PageShell } from "@/components/page-shell";
import { getDataset } from "@/lib/sheets";
import type { EventItem } from "@/lib/types";

export default async function EventsPage() {
  const events = (await getDataset("events")) as EventItem[];

  return (
    <PageShell>
      <PageHero eyebrow="Календарь" title="Мероприятия школы" text="Месяц, неделя, ближайшие события, категории и фильтрация по классам." />
      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <CalendarView items={events} />
      </section>
    </PageShell>
  );
}
