import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ScrollToTop } from "@/components/scroll-to-top";
import "./globals.css";

export const metadata: Metadata = {
  title: "Школа №46",
  description: "Современная цифровая школьная платформа"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ru">
      <body>
        {children}
        <ScrollToTop />
      </body>
    </html>
  );
}
