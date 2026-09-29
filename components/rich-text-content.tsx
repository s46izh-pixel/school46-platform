"use client";

import { richTextToSafeHtml } from "@/lib/rich-text";
import { useMemo } from "react";

export function RichTextContent({ value, className = "" }: { value: string; className?: string }) {
  const html = useMemo(() => richTextToSafeHtml(value), [value]);
  return (
    <div
      className={`rich-text-content break-words leading-7 text-slate-700 [&_a]:font-semibold [&_a]:text-apple [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-apple [&_blockquote]:bg-sky-50 [&_blockquote]:px-4 [&_blockquote]:py-3 [&_h2]:mb-3 [&_h2]:mt-5 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-ink [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-ink [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-3 [&_ul]:list-disc [&_ul]:pl-6 ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
