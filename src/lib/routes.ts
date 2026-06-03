export function getChapterSlug(file: string): string {
  return file.replace(/\.md$/i, "");
}

export function getChapterPath(slugOrFile: string): string {
  const slug = getChapterSlug(slugOrFile);
  return `/chapters/${encodeURIComponent(slug)}/`;
}
