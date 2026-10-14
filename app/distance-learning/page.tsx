import { DistanceLearningView } from "@/components/distance-learning-view";
import { PageHero, PageShell } from "@/components/page-shell";
import { getDistanceLearningData, todayInSamara } from "@/lib/distance-learning";

export const dynamic = "force-static";
export const revalidate = 1800;
export const runtime = "nodejs";

export default async function DistanceLearningPage() {
  const today = todayInSamara();
  const { saturdayDays, temporaryDays } = await getDistanceLearningData(today);
  return (
    <PageShell>
      <PageHero
        eyebrow="Учебный процесс"
        title="Дистанционное обучение"
        text="Задания для дистанционных суббот и временного дистанта по болезни, карантину или другим обстоятельствам."
      />
      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <DistanceLearningView saturdayDays={saturdayDays} temporaryDays={temporaryDays} today={today} />
      </section>
    </PageShell>
  );
}
