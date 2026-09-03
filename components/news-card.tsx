import { NewsItem } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Tag } from "lucide-react";

export function NewsCard({ item }: { item: NewsItem }) {
  return (
    <article className="overflow-hidden rounded-[8px] border border-line bg-white shadow-sm">
      <div className="relative aspect-[16/10] bg-slate-100">
        <img src={item.photo} alt="" loading="lazy" className="h-full w-full object-cover" />
      </div>
      <div className="p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
          <span>{formatDate(item.date)}</span>
          <span className="rounded-[8px] bg-slate-100 px-2 py-1">{item.className}</span>
          <span className="rounded-[8px] bg-blue-50 px-2 py-1 text-apple">{item.category}</span>
        </div>
        <h3 className="text-lg font-semibold text-ink">{item.title}</h3>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{item.text}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {item.tags.map((tag) => (
            <span key={tag} className="flex items-center gap-1 rounded-[8px] bg-mist px-2 py-1 text-xs text-slate-600">
              <Tag size={12} />
              {tag}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}
