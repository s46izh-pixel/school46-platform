import { PageHero, PageShell } from "@/components/page-shell";
import { getDataset } from "@/lib/sheets";
import type { BellSchedule } from "@/lib/types";

export default async function BellsPage() {
  const bells = (await getDataset("bells")) as BellSchedule[];

  return (
    <PageShell>
      <PageHero eyebrow="Звонки" title="Расписание звонков" text="Время начала и окончания уроков, а также перемены между занятиями." />
      <section className="mx-auto grid max-w-3xl gap-2 px-4 pb-12 sm:px-6 lg:px-8">
        {bells.map((bell) => (
          <div key={bell.lesson} className="grid grid-cols-[80px_1fr_auto] rounded-[8px] border border-line bg-white p-4 shadow-sm">
            <span className="font-semibold text-apple">{bell.lesson} урок</span>
            <span>{bell.start} - {bell.end}</span>
            <span className="text-slate-500">{bell.break}</span>
          </div>
        ))}
      </section>
    </PageShell>
  );
}
