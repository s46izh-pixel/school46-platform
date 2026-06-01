import { PageShell } from "@/components/page-shell";
import { news } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import Image from "next/image";
import { notFound } from "next/navigation";

export default function NewsItemPage({ params }: { params: { slug: string } }) {
  const item = news.find((entry) => entry.slug === params.slug);
  if (!item) notFound();

  return (
    <PageShell>
      <article className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold text-apple">{formatDate(item.date)} · {item.category}</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink md:text-6xl">{item.title}</h1>
        <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-[8px] bg-slate-100">
          <Image src={item.photo} alt="" fill className="object-cover" />
        </div>
        <p className="mt-8 text-lg leading-8 text-slate-700">{item.text}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {item.tags.map((tag) => <span key={tag} className="rounded-[8px] bg-mist px-3 py-2 text-sm font-semibold text-slate-600">{tag}</span>)}
        </div>
      </article>
    </PageShell>
  );
}
