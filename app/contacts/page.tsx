import { PageHero, PageShell } from "@/components/page-shell";

export default function ContactsPage() {
  return (
    <PageShell>
      <PageHero eyebrow="Контакты" title="Школа №46 на связи" text="Основные контакты, часы работы и быстрые каналы связи будут подключены на следующем этапе." />
      <section className="mx-auto grid max-w-4xl gap-3 px-4 pb-12 sm:px-6 lg:px-8">
        {["Приемная: +7 (000) 000-00-00", "Почта: school46@example.com", "Адрес: укажите фактический адрес школы"].map((item) => (
          <div key={item} className="rounded-[8px] border border-line bg-white p-4 shadow-sm">{item}</div>
        ))}
      </section>
    </PageShell>
  );
}
