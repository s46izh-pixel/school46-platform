import { PageHero, PageShell } from "@/components/page-shell";
import { ScheduleView } from "@/components/schedule-view";
import { getDataset, getScheduleChanges } from "@/lib/sheets";
import type { BellSchedule, ScheduleChange, ScheduleLesson } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SchedulePage() {
  const [lessons, bells, changes] = await Promise.all([
    getDataset("schedule") as Promise<ScheduleLesson[]>,
    getDataset("bells") as Promise<BellSchedule[]>,
    getScheduleChanges() as Promise<ScheduleChange[]>
  ]);

  return (
    <PageShell>
      <PageHero eyebrow="Расписание" title="Уроки и педагоги" text="Выберите класс или педагога. Выбор сохраняется и используется при следующем входе." />
      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <ScheduleView lessons={lessons} bells={bells} changes={changes} />
      </section>
    </PageShell>
  );
}
