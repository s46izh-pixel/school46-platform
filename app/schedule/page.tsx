import { PageHero, PageShell } from "@/components/page-shell";
import { ScheduleView } from "@/components/schedule-view";
import { getDataset } from "@/lib/sheets";
import type { BellSchedule, ScheduleLesson } from "@/lib/types";

export default async function SchedulePage() {
  const [lessons, bells] = await Promise.all([
    getDataset("schedule") as Promise<ScheduleLesson[]>,
    getDataset("bells") as Promise<BellSchedule[]>
  ]);

  return (
    <PageShell>
      <PageHero eyebrow="Расписание" title="Уроки и педагоги" text="Выберите класс или педагога. Выбор сохраняется и используется при следующем входе." />
      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <ScheduleView lessons={lessons} bells={bells} />
      </section>
    </PageShell>
  );
}
