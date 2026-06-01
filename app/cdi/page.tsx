import { EventCard } from "@/components/event-card";
import { NewsCard } from "@/components/news-card";
import { PageHero, PageShell } from "@/components/page-shell";
import { events, news } from "@/lib/mock-data";

export default function CdiPage() {
  const cdiNews = news.filter((item) => item.category === "ЦДИ");

  return (
    <PageShell>
      <PageHero eyebrow="ЦДИ" title="Центр детских инициатив" text="Пространство школьного актива: инициативы, события, заявки на участие и новости самоуправления." />
      <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-12 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div>
          <h2 className="mb-4 text-2xl font-semibold">Новости ЦДИ</h2>
          <div className="grid gap-5 md:grid-cols-2">
            {cdiNews.map((item) => <NewsCard key={item.id} item={item} />)}
          </div>
        </div>
        <aside className="grid gap-4">
          {events.slice(0, 2).map((item) => <EventCard key={item.id} item={item} />)}
          <div className="rounded-[8px] border border-line bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Заявки на участие</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">В первом этапе заявки фиксируются через школьную админку, затем будут отправляться напрямую в Google Sheets.</p>
          </div>
        </aside>
      </section>
    </PageShell>
  );
}
