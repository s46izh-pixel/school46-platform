import { ApplicationForm } from "@/components/application-form";
import { PageHero, PageShell } from "@/components/page-shell";
import { getDataset } from "@/lib/sheets";
import type { EventItem } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import Image from "next/image";
import { notFound } from "next/navigation";

export default async function EventPage({ params }: { params: { slug: string } }) {
  const events = (await getDataset("events")) as EventItem[];
  const item = events.find((entry) => entry.slug === params.slug);
  if (!item) notFound();

  return (
    <PageShell>
      <PageHero eyebrow={item.category} title={item.title} text={item.description} />
      <section className="mx-auto grid max-w-4xl gap-4 px-4 pb-12 sm:px-6 lg:px-8">
        <div className="relative aspect-[16/9] overflow-hidden rounded-[8px] bg-slate-100 shadow-soft">
          <Image src={item.cover} alt="" fill className="object-cover" />
        </div>
        {[
          `Дата: ${formatDate(item.date)}`,
          `Время: ${item.time}`,
          `Место: ${item.place}`,
          `Участники: ${item.participants}`,
          `Ответственный: ${item.owner}`,
          `Статус: ${item.status}`
        ].map((line) => <div key={line} className="rounded-[8px] border border-line bg-white p-4 shadow-sm">{line}</div>)}
        <div className="flex flex-wrap gap-2">
          {item.tags.map((tag) => <span key={tag} className="rounded-[8px] bg-mist px-3 py-2 text-sm font-semibold text-slate-600">{tag}</span>)}
        </div>
        {item.acceptApplications ? (
          <section id="application" className="pt-6">
            <h2 className="mb-4 text-2xl font-semibold text-ink">{item.applicationButtonText}</h2>
            {item.applicationDeadline ? <p className="mb-4 text-sm font-semibold text-coral">Дедлайн: {formatDate(item.applicationDeadline)}</p> : null}
            <ApplicationForm event={item} />
          </section>
        ) : null}
      </section>
    </PageShell>
  );
}
