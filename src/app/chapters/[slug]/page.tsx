import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BookReader } from "@/components/book-reader";
import { StructuredData } from "@/components/structured-data";
import { bookTitle, getBookChapterBySlug, getBookChapters } from "@/lib/book-data";
import { getChapterPath } from "@/lib/routes";
import {
  coverImageUrl,
  createBookJsonLd,
  createChapterBreadcrumbJsonLd,
  createChapterDescription,
  createChapterJsonLd
} from "@/lib/seo";
import { absoluteSiteUrl } from "@/lib/site";

type ChapterPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  const chapters = await getBookChapters();
  return chapters.map((chapter) => ({ slug: chapter.slug }));
}

export async function generateMetadata({ params }: ChapterPageProps): Promise<Metadata> {
  const { slug } = await params;
  const chapter = await getBookChapterBySlug(slug);
  if (!chapter) return {};

  const path = getChapterPath(chapter.slug);
  const description = createChapterDescription(chapter);
  const url = absoluteSiteUrl(path);

  return {
    title: chapter.title,
    description,
    alternates: {
      canonical: url
    },
    openGraph: {
      title: `${chapter.title} | ${bookTitle}`,
      description,
      url,
      siteName: bookTitle,
      type: "article",
      locale: "ru_RU",
      images: [
        {
          url: coverImageUrl,
          width: 512,
          height: 512,
          alt: `Обложка книги ${bookTitle}`
        }
      ]
    },
    twitter: {
      card: "summary",
      title: `${chapter.title} | ${bookTitle}`,
      description,
      images: [coverImageUrl]
    }
  };
}

export default async function ChapterPage({ params }: ChapterPageProps) {
  const { slug } = await params;
  const chapters = await getBookChapters();
  const chapter = chapters.find((item) => item.slug === slug);

  if (!chapter) notFound();

  return (
    <>
      <StructuredData
        data={[
          createBookJsonLd(chapters),
          createChapterJsonLd(chapter),
          createChapterBreadcrumbJsonLd(chapter)
        ]}
        id="chapter-json-ld"
      />
      <BookReader chapters={chapters} initialChapterFile={chapter.file} />
    </>
  );
}
