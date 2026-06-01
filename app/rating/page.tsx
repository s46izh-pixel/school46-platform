import { PageHero, PageShell } from "@/components/page-shell";
import { RatingSheetTable } from "@/components/rating-sheet-table";
import { getRatingLeaders } from "@/lib/rating";
import { getDataset, getRatingSheetTable } from "@/lib/sheets";
import type { RatingItem } from "@/lib/types";
import { Award, Medal, Trophy } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RatingPage() {
  const [rating, ratingSheet] = await Promise.all([
    getDataset("rating") as Promise<RatingItem[]>,
    getRatingSheetTable()
  ]);
  const leaders = getRatingLeaders(rating);
  const placeStyles = [
    { icon: Trophy, label: "1 место", className: "bg-amber-50 text-amber-800 ring-amber-200" },
    { icon: Medal, label: "2 место", className: "bg-slate-100 text-slate-700 ring-slate-200" },
    { icon: Award, label: "3 место", className: "bg-orange-50 text-orange-800 ring-orange-200" }
  ];

  return (
    <PageShell>
      <PageHero eyebrow="Рейтинг" title="Рейтинг классов" text="Баллы за активность, победы, медиа, волонтерство и школьные инициативы." />
      <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-12 sm:px-6 lg:px-8">
        <div>
          <h2 className="mb-4 text-2xl font-semibold text-ink">Лидеры рейтинга</h2>
          <div className="grid gap-5 md:grid-cols-3">
            {leaders.map((group) => (
              <article key={group.id} className="glass rounded-[8px] p-5">
                <Trophy className="mb-4 text-coral" size={30} />
                <p className="text-sm font-semibold text-apple">{group.title}</p>
                <div className="mt-4 grid gap-2">
                  {group.top.length ? group.top.map((item, index) => {
                    const place = placeStyles[index];
                    const Icon = place.icon;
                    return (
                      <div key={item.className} className={`flex items-center justify-between gap-3 rounded-[8px] px-3 py-2 ring-1 ${place.className}`}>
                        <span className="flex items-center gap-2 text-sm font-semibold">
                          <Icon size={17} />
                          {place.label}
                        </span>
                        <span className="text-right">
                          <span className="block text-lg font-semibold">{item.className}</span>
                          <span className="block text-xs">{item.points} баллов</span>
                        </span>
                      </div>
                    );
                  }) : <p className="text-sm text-slate-500">Нет данных</p>}
                </div>
              </article>
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-4 text-2xl font-semibold text-ink">Полная таблица по мероприятиям</h2>
          <RatingSheetTable sheet={ratingSheet} />
        </div>
      </section>
    </PageShell>
  );
}
