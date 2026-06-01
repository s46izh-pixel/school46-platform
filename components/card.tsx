import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("glass rounded-[8px] p-5", className)}>{children}</section>;
}

export function SectionTitle({
  eyebrow,
  title,
  action
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow ? <p className="mb-2 text-sm font-semibold text-apple">{eyebrow}</p> : null}
        <h2 className="text-2xl font-semibold tracking-normal text-ink md:text-3xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}
