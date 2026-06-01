import type { ReactNode } from "react";
import { Footer } from "./footer";
import { Header } from "./header";
import { MobileNav } from "./mobile-nav";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main className="pb-20 md:pb-0">{children}</main>
      <Footer />
      <MobileNav />
    </>
  );
}

export function PageHero({ title, text, eyebrow }: { title: string; text: string; eyebrow?: string }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {eyebrow ? <p className="mb-3 text-sm font-semibold text-apple">{eyebrow}</p> : null}
      <h1 className="max-w-4xl text-4xl font-semibold tracking-normal text-ink md:text-6xl">{title}</h1>
      <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">{text}</p>
    </section>
  );
}
