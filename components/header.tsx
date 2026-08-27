import Link from "next/link";
import { School } from "lucide-react";
import { TopControls } from "./top-controls";
import { WelcomePersonalizer } from "./welcome-personalizer";

const nav = [
  { href: "/", label: "Главная" },
  { href: "/news", label: "Новости" },
  { href: "/schedule", label: "Расписание" },
  { href: "/rating", label: "Рейтинг" },
  { href: "/events", label: "События" }
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-nowrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 shrink-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] bg-ink text-white">
            <School size={22} />
          </span>
          <span className="min-w-0">
            <span className="hidden text-sm text-slate-500 xl:block">Цифровая платформа</span>
            <span className="block truncate font-semibold text-ink">Школа №46</span>
          </span>
        </Link>
        <nav className="hidden min-w-0 items-center gap-1 whitespace-nowrap lg:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="focus-ring rounded-[8px] px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <TopControls />
      </div>
      <WelcomePersonalizer />
    </header>
  );
}
