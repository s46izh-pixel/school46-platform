import { EventItem } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { MapPin, Send } from "lucide-react";
import Link from "next/link";

export function EventCard({ item }: { item: EventItem }) {
  return (
    <article className="rounded-[8px] border border-line bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-apple">
            {formatDate(item.date)} · {item.time}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-ink">{item.title}</h3>
        </div>
        <span className="rounded-[8px] bg-mist px-2 py-1 text-xs font-semibold text-slate-600">{item.category}</span>
      </div>
      {item.description ? <p className="text-sm leading-6 text-slate-600">{item.description}</p> : null}
      <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
        <MapPin size={16} />
        {item.place} · {item.participants}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href={`/events/${item.slug}`} className="rounded-[8px] bg-ink px-3 py-2 text-sm font-semibold text-white">
          Подробнее
        </Link>
        {item.acceptApplications ? (
          <Link href={`/events/${item.slug}#application`} className="flex items-center gap-2 rounded-[8px] bg-blue-50 px-3 py-2 text-sm font-semibold text-apple">
            <Send size={15} />
            {item.applicationButtonText}
          </Link>
        ) : null}
      </div>
    </article>
  );
}
