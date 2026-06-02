import type { Metadata } from "next";
import type { ReactNode } from "react";

import { YandexMetrika } from "@/components/yandex-metrika";
import { bookDescription, bookTitle } from "@/lib/book-data";

import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const faviconPath = `${basePath}/favicon.png`;

export const metadata: Metadata = {
  title: `${bookTitle} | Читалка`,
  description: bookDescription,
  icons: {
    apple: [{ url: faviconPath, type: "image/png", sizes: "512x512" }],
    icon: [{ url: faviconPath, type: "image/png", sizes: "512x512" }]
  },
  openGraph: {
    title: bookTitle,
    description: bookDescription,
    type: "article",
    locale: "ru_RU"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        {children}
        <YandexMetrika />
      </body>
    </html>
  );
}
