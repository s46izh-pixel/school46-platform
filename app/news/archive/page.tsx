import { NewsCard } from "@/components/news-card";
import { PageHero, PageShell } from "@/components/page-shell";
import { news } from "@/lib/mock-data";

export default function NewsArchivePage() {
  return (
    <PageShell>
      <PageHero eyebrow="Архив" title="Архив новостей" text="Здесь остаются старые публикации, черновики и материалы, которые больше не показываются в главной ленте." />
      <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-12 sm:px-6 md:grid-cols-3 lg:px-8">
        {news.map((item) => <NewsCard key={item.id} item={item} />)}
      </section>
    </PageShell>
  );
}
