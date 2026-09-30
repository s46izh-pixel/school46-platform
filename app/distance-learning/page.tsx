import { DistanceLearningView } from "@/components/distance-learning-view";
import { PageHero, PageShell } from "@/components/page-shell";
import { DISTANCE_LEARNING_REVALIDATE_SECONDS } from "@/lib/cache";
import { getDistanceLearningData } from "@/lib/distance-learning";

export const revalidate = DISTANCE_LEARNING_REVALIDATE_SECONDS;
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

function todayInSamara() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Samara",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}
