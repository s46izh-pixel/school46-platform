import { ApplicationForm } from "@/components/application-form";
import { PageHero, PageShell } from "@/components/page-shell";
import { getDataset } from "@/lib/sheets";
import type { EventItem } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { CalendarDays, CheckCircle2, ClipboardList, FileText, ImageIcon, MapPin, Users } from "lucide-react";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

export default async function EventPage({ params }: { params: { slug: string } }) {
  const events = (await getDataset("events")) as EventItem[];
  const requestedSlug = decodeURIComponent(params.slug);
  const item = events.find((entry) => entry.slug === requestedSlug || encodeURIComponent(entry.slug) === params.slug);
  if (!item) notFound();

  return (
    <PageShell>
      <PageHero eyebrow={item.category} title={item.title} text={item.description || "Подробная страница мероприятия: сроки, участники, положение и заявка."} />
      <section className="mx-auto grid max-w-6xl gap-5 px-4 pb-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-8">
        <div className="grid gap-5">
          <div className="relative aspect-[16/9] overflow-hidden rounded-[8px] bg-slate-100 shadow-soft">
            <img src={item.cover} alt="" className="h-full w-full object-cover" />
          </div>

          <InfoSection icon={<ClipboardList />} title="Положение о мероприятии">
            <p>{item.description || "Здесь размещается подробное положение: цель мероприятия, сроки проведения, порядок участия, требования к работам и критерии оценки."}</p>
            <ul>
              <li>Участники: {item.participants || "уточняется"}</li>
              <li>Категория: {item.category}</li>
              <li>Ответственный: {item.owner || "Школа №46"}</li>
            </ul>
          </InfoSection>

          <InfoSection icon={<CheckCircle2 />} title="Как принять участие">
            <p>Ознакомьтесь с условиями, подготовьте материалы и отправьте заявку через форму на этой странице, если приём заявок открыт.</p>
            <ul>
              <li>Проверьте дату и время проведения.</li>
              <li>Подготовьте ФИО участника, класс и контакт для связи.</li>
              <li>При необходимости прикрепите файл или ссылку на работу.</li>
            </ul>
          </InfoSection>

          <InfoSection icon={<ImageIcon />} title="Материалы и изображения">
            <p>В этом блоке можно размещать афишу, положение, шаблоны документов, примеры работ и дополнительные изображения мероприятия.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-[8px] bg-mist px-3 py-2 text-sm font-semibold text-slate-600">Афиша мероприятия</div>
              <div className="rounded-[8px] bg-mist px-3 py-2 text-sm font-semibold text-slate-600">Положение / документ</div>
            </div>
          </InfoSection>

          {item.acceptApplications ? (
            <section id="application" className="pt-2">
              <h2 className="mb-4 text-2xl font-semibold text-ink">{item.applicationButtonText}</h2>
              {item.applicationDeadline ? <p className="mb-4 text-sm font-semibold text-coral">Дедлайн: {formatDate(item.applicationDeadline)}</p> : null}
              <ApplicationForm event={item} />
            </section>
          ) : (
            <div className="rounded-[8px] border border-line bg-white p-5 shadow-sm">
              <h2 className="text-2xl font-semibold text-ink">Заявочная форма</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Для этого мероприятия заявочная форма пока не включена. Её можно настроить в админке: поля, файлы, дедлайн и текст кнопки.</p>
            </div>
          )}
        </div>

        <aside className="grid content-start gap-3">
          <MetaCard icon={<CalendarDays />} label="Дата" value={formatDate(item.date)} />
          <MetaCard icon={<CalendarDays />} label="Время" value={item.time || "уточняется"} />
          <MetaCard icon={<MapPin />} label="Место" value={item.place || "уточняется"} />
          <MetaCard icon={<Users />} label="Участники" value={item.participants || "Все классы"} />
          <MetaCard icon={<FileText />} label="Статус" value={item.status} />
          <div className="flex flex-wrap gap-2 rounded-[8px] border border-line bg-white p-4 shadow-sm">
            {item.tags.map((tag) => <span key={tag} className="rounded-[8px] bg-mist px-3 py-2 text-sm font-semibold text-slate-600">{tag}</span>)}
          </div>
        </aside>
      </section>
    </PageShell>
  );
}

function MetaCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-line bg-white p-4 shadow-sm">
      <div className="mb-2 text-apple">{icon}</div>
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-ink">{value}</p>
    </div>
  );
}

function InfoSection({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="prose prose-slate max-w-none rounded-[8px] border border-line bg-white p-5 shadow-sm prose-headings:text-ink prose-p:leading-7 prose-li:my-1">
      <h2 className="not-prose mb-3 flex items-center gap-2 text-2xl font-semibold text-ink">
        <span className="text-apple">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}
