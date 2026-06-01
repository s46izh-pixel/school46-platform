import { EventCard } from "@/components/event-card";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { MobileNav } from "@/components/mobile-nav";
import { NewsCard } from "@/components/news-card";
import { RatingTable } from "@/components/rating-table";
import { Card, SectionTitle } from "@/components/card";
import { ScheduleView } from "@/components/schedule-view";
import { UserPreferencesPanel } from "@/components/user-preferences-panel";
import { applications, news } from "@/lib/mock-data";
import { getRatingLeaders } from "@/lib/rating";
import { getDataset } from "@/lib/sheets";
import type { BellSchedule, EventItem, RatingItem, ScheduleLesson } from "@/lib/types";
import { ArrowRight, Bell, CalendarCheck, FileText, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";

export default async function Home() {
  const [events, lessons, bells, rating] = await Promise.all([
    getDataset("events") as Promise<EventItem[]>,
    getDataset("schedule") as Promise<ScheduleLesson[]>,
    getDataset("bells") as Promise<BellSchedule[]>,
    getDataset("rating") as Promise<RatingItem[]>
  ]);
  const publishedNews = news.filter((item) => item.status === "published");
  const leaders = getRatingLeaders(rating);

  return (
    <>
      <Header />
      <main>
        <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-12 pt-10 sm:px-6 md:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <div className="flex min-h-[520px] flex-col justify-center">
            <p className="mb-4 inline-flex w-fit items-center gap-2 rounded-[8px] bg-white px-3 py-2 text-sm font-semibold text-apple shadow-sm">
              <Sparkles size={16} />
              Школа №46 онлайн
            </p>
            <h1 className="max-w-3xl text-5xl font-semibold tracking-normal text-ink md:text-7xl">
              Цифровая школьная платформа
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
              <Link href="/admin" className="focus-ring rounded-[8px] border border-line bg-white px-5 py-3 font-semibold text-ink">
                Панель управления
              </Link>
            </div>
          </div>
          <div className="grid content-end gap-4">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Сегодня</p>
                  <h2 className="mt-1 text-2xl font-semibold text-ink">6 уроков и 3 события</h2>
                </div>
                <CalendarCheck className="text-apple" size={32} />
              </div>
              <div className="mt-6 grid gap-3">
                {events.slice(0, 3).map((event) => (
                  <div key={event.id} className="grid grid-cols-[64px_1fr] gap-3 rounded-[8px] bg-white p-3">
                    <span className="font-semibold text-apple">{event.time}</span>
                    <span className="text-sm text-slate-700">{event.title}</span>
                  </div>
                ))}
              </div>
            </Card>
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <Trophy className="mb-4 text-coral" />
                <p className="text-3xl font-semibold">{leaders.flatMap((item) => item.leaders).map((item) => item.className).join(", ")}</p>
                <p className="text-sm text-slate-500">лидеры рейтинга</p>
              </Card>
              <Card>
                <FileText className="mb-4 text-mint" />
                <p className="text-3xl font-semibold">{applications.length}</p>
                <p className="text-sm text-slate-500">новая заявка</p>
              </Card>
            </div>
          </div>
        </section>

        <section className="bg-white py-12" id="news">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionTitle eyebrow="Лента школы" title="Последние новости" />
            <div className="grid gap-5 md:grid-cols-3">
              {publishedNews.slice(0, 3).map((item) => <NewsCard key={item.id} item={item} />)}
            </div>
          </div>
        </section>

        <section className="py-12" id="schedule">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionTitle eyebrow="Учебный день" title="Расписание уроков и звонков" />
            <ScheduleView lessons={lessons} bells={bells} />
          </div>
        </section>

        <section className="bg-white py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionTitle eyebrow="Настройки" title="Персонализация пользователя" />
            <UserPreferencesPanel />
          </div>
        </section>

        <section className="bg-white py-12" id="rating">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionTitle eyebrow="Активность классов" title="Рейтинг и достижения" />
            <RatingTable items={rating} />
          </div>
        </section>

        <section className="py-12" id="events">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionTitle
              eyebrow="Календарь"
              title="Ближайшие события, акции и конкурсы"
              action={<Link className="flex items-center gap-2 text-sm font-semibold text-apple" href="/admin">Управлять <ArrowRight size={16} /></Link>}
            />
            <div className="grid gap-5 md:grid-cols-3">
              {events.map((item) => <EventCard key={item.id} item={item} />)}
            </div>
          </div>
        </section>

        <section className="bg-ink py-12 text-white">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 md:grid-cols-[1fr_360px] lg:px-8">
            <div>
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-200"><Bell size={16} /> Персональные настройки</p>
              <h2 className="text-3xl font-semibold">Сайт запоминает выбранный класс и педагога</h2>
              <p className="mt-4 max-w-2xl leading-7 text-slate-300">
                Данные сохраняются в localStorage, а публичная часть общается с Google Sheets только через серверные API.
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
