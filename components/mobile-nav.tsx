import Link from "next/link";
import { CalendarDays, Home, Megaphone, Newspaper, Trophy } from "lucide-react";

const items = [
  { href: "/", label: "Главная", icon: Home },
  { href: "/news", label: "Новости", icon: Newspaper },
  { href: "/schedule", label: "Расписание", icon: CalendarDays },
  { href: "/rating", label: "Рейтинг", icon: Trophy },
  { href: "/events", label: "События", icon: Megaphone }
];

export function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-white/90 px-2 py-2 backdrop-blur-xl md:hidden">
      <div className="grid grid-cols-5 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="grid place-items-center gap-1 rounded-[8px] px-1 py-2 text-[11px] font-semibold text-slate-600">
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
