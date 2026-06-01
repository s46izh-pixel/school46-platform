import { RatingItem } from "@/lib/types";
import { Award } from "lucide-react";

export function RatingTable({ items }: { items: RatingItem[] }) {
  return (
    <div className="overflow-hidden rounded-[8px] border border-line bg-white">
      <div className="grid grid-cols-[72px_1fr_90px] bg-slate-50 px-4 py-3 text-xs font-semibold uppercase text-slate-500 md:grid-cols-[72px_1fr_100px_240px]">
        <span>Место</span>
        <span>Класс</span>
        <span>Баллы</span>
        <span className="hidden md:block">Поля таблицы</span>
      </div>
      {items.map((item) => (
        <div
          key={item.className}
          className="grid grid-cols-[72px_1fr_90px] items-center border-t border-line px-4 py-4 text-sm md:grid-cols-[72px_1fr_100px_240px]"
        >
          <span className="flex items-center gap-2 font-semibold text-ink">
            {item.place <= 3 ? <Award size={17} className="text-coral" /> : null}
            {item.place}
          </span>
          <span>
            <span className="block font-semibold text-ink">{item.className}</span>
            {!item.fields?.length && item.comment ? (
              <span className="block text-xs text-slate-500">{item.comment}</span>
            ) : null}
          </span>
          <span className="font-semibold text-apple">{item.points}</span>
          <span className="hidden text-xs leading-5 text-slate-600 md:block">
            {item.fields?.slice(0, 3).map((field) => `${field.title}: ${field.value}`).join(" · ") || "Нет заполненных полей"}
          </span>
        </div>
      ))}
    </div>
  );
}
