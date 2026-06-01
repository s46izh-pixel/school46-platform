import { CalendarView } from "@/components/calendar-view";
import { NewsCard } from "@/components/news-card";
import { PageHero, PageShell } from "@/components/page-shell";
import { events, news } from "@/lib/mock-data";

export default function NavigatorsPage() {
  const items = news.filter((item) => item.category === "Навигаторы детства");
  const navEvents = events.filter((item) => item.category === "Навигаторы детства");

  return (
    <PageShell>
      <PageHero eyebrow="Навигаторы детства" title="Проекты воспитательной команды" text="Мероприятия, акции, календарь и новости направления для учеников и классных команд." />
      <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-12 sm:px-6 lg:px-8">
        <CalendarView items={navEvents.length ? navEvents : events} />
        <div className="grid gap-5 md:grid-cols-3">
          {items.map((item) => <NewsCard key={item.id} item={item} />)}
        </div>
      </section>
    </PageShell>
  );
}
