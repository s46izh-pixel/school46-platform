import { PageHero, PageShell } from "@/components/page-shell";
import { getDataset } from "@/lib/sheets";
import type { BellSchedule } from "@/lib/types";

export default async function BellsPage() {
  const bells = (await getDataset("bells")) as BellSchedule[];
  const groups: Array<{ title: string; dayGroup: BellSchedule["dayGroup"]; shift: BellSchedule["shift"] }> = [
    { title: "Понедельник · 1 смена", dayGroup: "monday", shift: 1 },
    { title: "Понедельник · 2 смена", dayGroup: "monday", shift: 2 },
    { title: "Вторник-суббота · 1 смена", dayGroup: "regular", shift: 1 },
    { title: "Вторник-суббота · 2 смена", dayGroup: "regular", shift: 2 }
  ];

  return (
    <PageShell>
      <PageHero eyebrow="Звонки" title="Расписание звонков" text="Время начала и окончания уроков, а также перемены между занятиями." />
      <section className="mx-auto grid max-w-5xl gap-4 px-4 pb-12 sm:px-6 md:grid-cols-2 lg:px-8">
        {groups.map((group) => (
          <article key={`${group.dayGroup}-${group.shift}`} className="rounded-[8px] border border-line bg-white p-4 shadow-sm">
            <h2 className="mb-3 font-semibold text-ink">{group.title}</h2>
            <div className="grid gap-2">
              {bells
                .filter((bell) => bell.dayGroup === group.dayGroup && bell.shift === group.shift)
                .map((bell) => (
                  <div key={`${bell.dayGroup}-${bell.shift}-${bell.lesson}`} className="grid grid-cols-[80px_1fr] rounded-[8px] bg-mist px-3 py-2 text-sm">
                    <span className="font-semibold text-apple">{bell.lesson} урок</span>
                    <span>
                      {bell.start} - {bell.end}
                      {bell.break ? <span className="text-xs text-slate-500"> (перемена {bell.break})</span> : null}
                    </span>
                  </div>
                ))}
            </div>
          </article>
        ))}
      </section>
    </PageShell>
  );
}
