import type { MetadataRoute } from "next";

import { getBookChapters } from "@/lib/book-data";
import { getChapterPath } from "@/lib/routes";
import { absoluteSiteUrl } from "@/lib/site";

const lastModified = new Date("2026-06-03");

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const chapters = await getBookChapters();

  return [
    {
      url: absoluteSiteUrl("/"),
      lastModified,
      changeFrequency: "monthly",
      priority: 1
    },
    ...chapters.map((chapter) => ({
      url: absoluteSiteUrl(getChapterPath(chapter.slug)),
      lastModified,
      changeFrequency: "yearly" as const,
      priority: isMainBookChapter(chapter.file) ? 0.85 : 0.65
    }))
  ];
}

function isMainBookChapter(file: string): boolean {
  return /^\d{2}_chapter\.md$/.test(file);
}
