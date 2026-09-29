import { CalendarView } from "@/components/calendar-view";
import { PageHero, PageShell } from "@/components/page-shell";
import { getDataset, getEventCalendarMonths, getEventThoughts, getMonthlyEventNotes } from "@/lib/sheets";
import type { EventItem } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EventsPage() {
  const [events, monthlyItems, calendarMonths, dailyThoughts] = await Promise.all([
    getDataset("events") as Promise<EventItem[]>,
    getMonthlyEventNotes(),
    getEventCalendarMonths(),
    getEventThoughts()
  ]);

  return (
    <PageShell>
      <PageHero eyebrow="Календарь" title="Мероприятия школы" text="Месяц, неделя, категории и фильтрация по классам." />
      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <CalendarView items={events} monthlyItems={monthlyItems} availableMonths={calendarMonths} dailyThoughts={dailyThoughts} />
      </section>
    </PageShell>
  );
}
