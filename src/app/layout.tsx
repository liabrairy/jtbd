import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { YandexMetrika } from "@/components/yandex-metrika";
import { bookDescription, bookTitle } from "@/lib/book-data";
import { bookAuthor, coverImageUrl, originalBookTitle } from "@/lib/seo";
import { absoluteSiteUrl, siteUrl } from "@/lib/site";

import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const faviconPath = `${basePath}/favicon.png`;

export const metadata: Metadata = {
  metadataBase: new URL(`${siteUrl}/`),
  applicationName: bookTitle,
  title: {
    default: `${bookTitle} - русский перевод книги о Jobs to be Done`,
    template: `%s | ${bookTitle}`
  },
  description: bookDescription,
  authors: [{ name: bookAuthor }],
  alternates: {
    canonical: absoluteSiteUrl("/")
  },
  category: "book",
  icons: {
    apple: [{ url: faviconPath, type: "image/png", sizes: "512x512" }],
    icon: [{ url: faviconPath, type: "image/png", sizes: "512x512" }]
  },
  openGraph: {
    title: bookTitle,
    description: bookDescription,
    url: absoluteSiteUrl("/"),
    siteName: bookTitle,
    type: "book",
    locale: "ru_RU",
    images: [
      {
        url: coverImageUrl,
        width: 512,
        height: 512,
        alt: `Обложка книги ${originalBookTitle}`
      }
    ]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  },
  twitter: {
    card: "summary",
    title: bookTitle,
    description: bookDescription,
    images: [coverImageUrl]
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f4f0e6"
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
