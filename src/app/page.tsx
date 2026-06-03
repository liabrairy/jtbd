import { BookReader } from "@/components/book-reader";
import { StructuredData } from "@/components/structured-data";
import { getBookChapters } from "@/lib/book-data";
import { createBookJsonLd } from "@/lib/seo";

export const dynamic = "force-static";

export default async function Home() {
  const chapters = await getBookChapters();

  return (
    <>
      <StructuredData data={createBookJsonLd(chapters)} id="book-json-ld" />
      <BookReader chapters={chapters} />
    </>
  );
}
