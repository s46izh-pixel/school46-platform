import { PageHero, PageShell } from "@/components/page-shell";
import { teachers } from "@/lib/mock-data";

export default function TeachersPage() {
  return (
    <PageShell>
      <PageHero eyebrow="Учителям" title="Материалы для педагогов" text="Быстрый доступ к расписанию, событиям, заявкам классов и рабочим школьным сервисам." />
      <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-12 sm:px-6 md:grid-cols-2 lg:px-8">
        {teachers.map((teacher) => (
          <article key={teacher.id} className="rounded-[8px] border border-line bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-ink">{teacher.name}</h2>
            <p className="mt-2 text-sm text-slate-500">{teacher.subject}</p>
          </article>
        ))}
      </section>
    </PageShell>
  );
}
