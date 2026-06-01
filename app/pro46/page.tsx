import { NewsCard } from "@/components/news-card";
import { PageHero, PageShell } from "@/components/page-shell";
import { news, pro46Members, pro46Projects } from "@/lib/mock-data";

export default function Pro46Page() {
  const mediaNews = news.filter((item) => item.category === "Медиа" || item.tags.includes("PRo46"));

  return (
    <PageShell>
      <PageHero eyebrow="PRo46" title="Школьный медиацентр" text="Команда учеников, которая делает новости, фотоистории, подкасты, видеоафиши и репортажи о жизни школы." />
      <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-12 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div className="grid gap-6">
          <Block title="Проекты" items={pro46Projects} />
          <div>
            <h2 className="mb-4 text-2xl font-semibold">Новости PRo46</h2>
            <div className="grid gap-5 md:grid-cols-2">
              {mediaNews.map((item) => <NewsCard key={item.id} item={item} />)}
            </div>
          </div>
        </div>
        <aside className="grid gap-5">
          <Block title="Роли в команде" items={pro46Members} />
          <div className="rounded-[8px] border border-line bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Как вступить в PRo46</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">Выберите роль, подготовьте короткое портфолио или идею материала и оставьте заявку через классного руководителя или медиацентр.</p>
          </div>
        </aside>
      </section>
    </PageShell>
  );
}

function Block({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[8px] border border-line bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-xl font-semibold">{title}</h2>
      <div className="grid gap-2">
        {items.map((item) => <div key={item} className="rounded-[8px] bg-mist px-3 py-2 text-sm font-semibold text-slate-700">{item}</div>)}
      </div>
    </div>
  );
}
