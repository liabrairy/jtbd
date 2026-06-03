import { bookDescription, bookTitle } from "@/lib/book-data";
import { createTextExcerpt } from "@/lib/book-rendering";
import { getChapterPath } from "@/lib/routes";
import { absoluteSiteUrl } from "@/lib/site";
import type { BookChapter } from "@/types/book";

export const originalBookTitle = "When Coffee and Kale Compete";
export const bookAuthor = "Alan Klement";
export const translatorName = "@mark0vartem";

export const coverImageUrl = absoluteSiteUrl("/cover.png");

export function createChapterDescription(chapter: BookChapter): string {
  return (
    createTextExcerpt(findFirstMeaningfulParagraph(chapter.raw), 158) ||
    `${bookDescription} Раздел: ${chapter.title}.`
  );
}

export function createBookJsonLd(chapters: BookChapter[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Book",
    "@id": absoluteSiteUrl("/#book"),
    name: bookTitle,
    alternateName: originalBookTitle,
    author: {
      "@type": "Person",
      name: bookAuthor
    },
    description: bookDescription,
    image: coverImageUrl,
    inLanguage: "ru",
    isBasedOn: {
      "@type": "Book",
      name: originalBookTitle,
      author: {
        "@type": "Person",
        name: bookAuthor
      }
    },
    translator: {
      "@type": "Person",
      name: translatorName,
      url: "https://t.me/mark0vartem"
    },
    url: absoluteSiteUrl("/"),
    hasPart: chapters.map((chapter) => ({
      "@type": "Chapter",
      "@id": absoluteSiteUrl(`${getChapterPath(chapter.slug)}#chapter`),
      name: chapter.title,
      position: chapter.index + 1,
      url: absoluteSiteUrl(getChapterPath(chapter.slug))
    }))
  };
}

export function createChapterJsonLd(chapter: BookChapter): Record<string, unknown> {
  const chapterPath = getChapterPath(chapter.slug);

  return {
    "@context": "https://schema.org",
    "@type": "Chapter",
    "@id": absoluteSiteUrl(`${chapterPath}#chapter`),
    name: chapter.title,
    description: createChapterDescription(chapter),
    inLanguage: "ru",
    isPartOf: {
      "@id": absoluteSiteUrl("/#book")
    },
    position: chapter.index + 1,
    url: absoluteSiteUrl(chapterPath)
  };
}

export function createChapterBreadcrumbJsonLd(chapter: BookChapter): Record<string, unknown> {
  const chapterPath = getChapterPath(chapter.slug);

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: bookTitle,
        item: absoluteSiteUrl("/")
      },
      {
        "@type": "ListItem",
        position: 2,
        name: chapter.title,
        item: absoluteSiteUrl(chapterPath)
      }
    ]
  };
}

function findFirstMeaningfulParagraph(markdown: string): string {
  const blocks = markdown
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim());

  return (
    blocks.find((block) => {
      if (!block) return false;
      if (/^#{1,6}\s+/.test(block)) return false;
      if (/^[-*]\s+/m.test(block)) return false;
      if (/^!\[[^\]]*]/.test(block)) return false;
      if (/^\*\*Рис\.\s*\d+/i.test(block)) return false;
      return block.length > 80;
    }) || markdown
  );
}
