import { EventCard } from "@/components/event-card";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { HomeNewsGrid } from "@/components/home-news-grid";
import { MobileNav } from "@/components/mobile-nav";
import { RatingTable } from "@/components/rating-table";
import { Card, SectionTitle } from "@/components/card";
import { ScheduleView } from "@/components/schedule-view";
import { HomeGreeting } from "@/components/home-greeting";
import { HomeSectionGate } from "@/components/home-section-gate";
import { TodayOverview } from "@/components/today-overview";
import { UserPreferencesPanel } from "@/components/user-preferences-panel";
import { news } from "@/lib/mock-data";
import { getRatingLeaders } from "@/lib/rating";
import { getDataset, getScheduleChanges } from "@/lib/sheets";
import type { BellSchedule, EventItem, RatingItem, ScheduleChange, ScheduleLesson } from "@/lib/types";
import { Bell, Trophy } from "lucide-react";
import Link from "next/link";

export default async function Home() {
  const [events, lessons, bells, rating, changes] = await Promise.all([
    getDataset("events") as Promise<EventItem[]>,
    getDataset("schedule") as Promise<ScheduleLesson[]>,
    getDataset("bells") as Promise<BellSchedule[]>,
    getDataset("rating") as Promise<RatingItem[]>,
    getScheduleChanges() as Promise<ScheduleChange[]>
  ]);
  const publishedNews = news.filter((item) => item.status === "published");
  const leaders = getRatingLeaders(rating);

  return (
    <>
      <Header />
      <main>
        <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-12 pt-10 sm:px-6 md:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <div className="flex min-h-[520px] flex-col justify-center">
            <HomeGreeting />
            <h1 className="max-w-3xl text-5xl font-semibold tracking-normal text-ink md:text-7xl">
              Цифровая платформа школы
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Новости, расписание, события, рейтинг классов и заявки на конкурсы в едином аккуратном интерфейсе.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#schedule" className="focus-ring rounded-[8px] bg-ink px-5 py-3 font-semibold text-white">
                Открыть расписание
              </a>
              <Link href="/news" className="focus-ring rounded-[8px] border border-line bg-white px-5 py-3 font-semibold text-ink">
                Лента новостей
              </Link>
            </div>
          </div>
          <div className="grid content-end gap-4">
            <TodayOverview events={events} lessons={lessons} changes={changes} />
            <div>
              <Card>
                <Trophy className="mb-4 text-coral" />
                <p className="text-3xl font-semibold">{leaders.flatMap((item) => item.leaders).map((item) => item.className).join(", ")}</p>
                <p className="text-sm text-slate-500">лидеры рейтинга</p>
                <Link href="/rating" className="mt-4 inline-flex rounded-[8px] bg-mist px-3 py-2 text-sm font-semibold text-ink">
                  Открыть рейтинг
                </Link>
              </Card>
            </div>
          </div>
        </section>

        <HomeSectionGate id="news">
          <section className="bg-white py-12" id="news">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <SectionTitle eyebrow="Лента школы" title="Последние новости" />
              <HomeNewsGrid items={publishedNews} />
            </div>
          </section>
        </HomeSectionGate>

        <HomeSectionGate id="schedule">
          <section className="py-12" id="schedule">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <SectionTitle eyebrow="Учебный день" title="Расписание уроков и звонков" />
              <ScheduleView lessons={lessons} bells={bells} changes={changes} />
            </div>
          </section>
        </HomeSectionGate>

        <HomeSectionGate id="personalization">
          <section className="bg-white py-12">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <SectionTitle eyebrow="Настройки" title="Персонализация пользователя" />
              <UserPreferencesPanel />
            </div>
          </section>
        </HomeSectionGate>

        <HomeSectionGate id="rating">
          <section className="bg-white py-12" id="rating">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <SectionTitle eyebrow="Активность классов" title="Рейтинг и достижения" />
              <RatingTable items={rating} />
            </div>
          </section>
        </HomeSectionGate>

        <HomeSectionGate id="events">
          <section className="py-12" id="events">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <SectionTitle
                eyebrow="Календарь"
                title="Ближайшие события, акции и конкурсы"
              />
              <div className="grid gap-5 md:grid-cols-3">
                {events.map((item) => <EventCard key={item.id} item={item} />)}
              </div>
            </div>
          </section>
        </HomeSectionGate>

        <section className="bg-ink py-12 text-white">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 md:grid-cols-[1fr_360px] lg:px-8">
            <div>
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-200"><Bell size={16} /> Персональные настройки</p>
              <h2 className="text-3xl font-semibold">Сайт запоминает выбранный класс и педагога</h2>
              <p className="mt-4 max-w-2xl leading-7 text-slate-300">
                Персональный выбор класса сохраняется на устройстве, а материалы админки сохраняются в проекте и могут переноситься вместе с сайтом.
              </p>
            </div>
            <Link href="/api/news" className="self-end rounded-[8px] bg-white px-5 py-3 text-center font-semibold text-ink">
              Проверить API новостей
            </Link>
          </div>
        </section>
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}
