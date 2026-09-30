import Link from "next/link";
import { CalendarDays, Home, Laptop, Megaphone, Newspaper, Trophy } from "lucide-react";

const items = [
  { href: "/", label: "Главная", icon: Home },
  { href: "/news", label: "Новости", icon: Newspaper },
  { href: "/schedule", label: "Расписание", icon: CalendarDays },
  { href: "/distance-learning", label: "Дистант", icon: Laptop },
  { href: "/rating", label: "Рейтинг", icon: Trophy },
  { href: "/events", label: "События", icon: Megaphone }
];

export function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-white/90 px-2 py-2 backdrop-blur-xl md:hidden">
      <div className="grid grid-cols-6 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="grid min-w-0 place-items-center gap-1 rounded-[8px] px-0.5 py-2 text-[10px] font-semibold text-slate-600">
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
