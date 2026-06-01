import { NewsBrowser } from "@/components/news-browser";
import { PageHero, PageShell } from "@/components/page-shell";
import { news } from "@/lib/mock-data";

export default function NewsPage() {
  return (
    <PageShell>
      <PageHero eyebrow="Новости" title="Лента школы №46" text="Опубликованные новости, закрепленные материалы, рубрики, теги и быстрый поиск по школьной жизни." />
      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <NewsBrowser items={news} />
      </section>
    </PageShell>
  );
}
