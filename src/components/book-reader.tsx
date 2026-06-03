"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import {
  bookAssetUrl,
  createDefaultFigureImageMap,
  injectFigureImages,
  markdownToHtml
} from "@/lib/book-rendering";
import { getChapterPath } from "@/lib/routes";
import {
  reachYandexMetrikaGoal,
  sendYandexMetrikaHit,
  sendYandexMetrikaUserParams,
  yandexMetrikaGoals
} from "@/lib/yandex-metrika";
import type { BookChapter } from "@/types/book";

type BookReaderProps = {
  chapters: BookChapter[];
  initialChapterFile?: string;
};

type ReaderTheme = "" | "night";

type SectionLink = {
  id: string;
  title: string;
};

const bookAnalyticsId = "when-coffee-and-kale-compete-ru";
const bookCompletedStoreKey = "reader:book-completed:v1";
const bookStartedProgressThreshold = 10;
const bookStartedStoreKey = "reader:book-started:v1";
const chapterReadProgressThreshold = 95;
const mainChapterPattern = /^(\d{2})_chapter\.md$/;
const memoryStore = new Map<string, string>();
const readChaptersStoreKey = "reader:read-chapters:v1";
const readerIdStoreKey = "reader:id:v1";
const readerTitleSuffix = "Когда кофе и капуста конкурируют";

export function BookReader({ chapters, initialChapterFile }: BookReaderProps) {
  const figureImageMap = useMemo(() => createDefaultFigureImageMap(), []);
  const docs = useMemo(
    () =>
      chapters.map((chapter) => ({
        ...chapter,
        raw: injectFigureImages(chapter.raw, figureImageMap)
      })),
    [chapters, figureImageMap]
  );
  const initialIndex = useMemo(() => {
    const index = docs.findIndex((doc) => doc.file === initialChapterFile);
    return index >= 0 ? index : 0;
  }, [docs, initialChapterFile]);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [activeSection, setActiveSection] = useState("");
  const [fontSize, setFontSize] = useState(19);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [readProgress, setReadProgress] = useState(0);
  const [readerReady, setReaderReady] = useState(false);
  const [sections, setSections] = useState<SectionLink[]>([]);
  const [theme, setTheme] = useState<ReaderTheme>("");
  const contentRef = useRef<HTMLElement>(null);
  const initializedRef = useRef(false);
  const reportedGoalsRef = useRef(new Set<string>());
  const restoreScrollRef = useRef(true);

  const currentDoc = docs[activeIndex] || docs[0];
  const chapterHtml = useMemo(
    () => (currentDoc ? markdownToHtml(currentDoc.raw) : ""),
    [currentDoc]
  );
  const filteredDocs = useMemo(() => filterDocs(docs, query), [docs, query]);
  const wordTotal = useMemo(
    () => Math.round(docs.reduce((sum, doc) => sum + doc.words, 0) / 1000),
    [docs]
  );

  const updateProgress = useCallback(() => {
    const page = contentRef.current;
    if (!readerReady || !currentDoc || !page || typeof window === "undefined") return;

    const rect = page.getBoundingClientRect();
    const total = page.offsetHeight - window.innerHeight * 0.5;
    const read = Math.min(Math.max(-rect.top, 0), Math.max(total, 1));
    const progress = Math.round((read / Math.max(total, 1)) * 100);
    setReadProgress(progress);

    trackReadingProgress(currentDoc, docs, progress, reportedGoalsRef.current);
  }, [currentDoc, docs, readerReady]);

  const saveReadingPosition = useCallback(() => {
    if (!currentDoc || typeof window === "undefined") return;
    writeStore(`reader:scroll:${currentDoc.file}`, String(Math.max(window.scrollY, 0)));
  }, [currentDoc]);

  const openChapter = useCallback(
    (index: number, options: { restoreScroll?: boolean } = {}) => {
      if (index < 0 || index >= docs.length) return;

      saveReadingPosition();
      restoreScrollRef.current = Boolean(options.restoreScroll);
      setActiveIndex(index);
      setIsLibraryOpen(false);
      writeStore("reader:chapter", String(index));
    },
    [docs.length, saveReadingPosition]
  );

  useEffect(() => {
    if (initializedRef.current || !docs.length) return;

    initializedRef.current = true;
    const savedChapter = initialChapterFile ? initialIndex : Number(readStore("reader:chapter") || 0);
    const savedFont = Number(readStore("reader:font") || 19);
    const savedTheme = readStore("reader:theme") as ReaderTheme | null;

    restoreScrollRef.current = true;
    setActiveIndex(clamp(savedChapter, 0, docs.length - 1));
    setFontSize(clamp(savedFont, 16, 24));
    setTheme(savedTheme === "night" ? "night" : "");
    setReaderReady(true);
  }, [docs.length, initialChapterFile, initialIndex]);

  useEffect(() => {
    if (!readerReady || !initialChapterFile) return;

    restoreScrollRef.current = true;
    setActiveIndex(initialIndex);
  }, [initialChapterFile, initialIndex, readerReady]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    writeStore("reader:theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty("--reader-size", `${fontSize}px`);
    writeStore("reader:font", String(fontSize));
  }, [fontSize]);

  useEffect(() => {
    if (!readerReady || !currentDoc || typeof window === "undefined") return;

    document.title = `${currentDoc.title} | ${readerTitleSuffix}`;
    writeStore("reader:chapter", String(activeIndex));
    trackChapterView(currentDoc);

    const y = restoreScrollRef.current
      ? Number(readStore(`reader:scroll:${currentDoc.file}`) || 0)
      : 0;
    restoreScrollRef.current = false;

    window.setTimeout(
      () => window.scrollTo({ top: y, behavior: y > 0 ? "auto" : "smooth" }),
      0
    );
    window.setTimeout(updateProgress, 80);
  }, [activeIndex, currentDoc, readerReady, updateProgress]);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const headings = Array.from(content.querySelectorAll<HTMLHeadingElement>("h2, h3"));
    const nextSections = headings.map((heading, index) => {
      const id = `section-${activeIndex}-${index}`;
      heading.id = id;
      return {
        id,
        title: heading.textContent || ""
      };
    });

    setSections(nextSections);
    setActiveSection(nextSections[0]?.id || "");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );

    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [activeIndex, chapterHtml]);

  useEffect(() => {
    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, [chapterHtml, updateProgress]);

  useEffect(() => {
    const handleBeforeUnload = () => saveReadingPosition();
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saveReadingPosition]);

  if (!currentDoc) {
    return (
      <main className="reader">
        <article className="book-page">
          <div className="loading">Не удалось найти главы для публикации.</div>
        </article>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className={`library ${isLibraryOpen ? "open" : ""}`} id="library">
        <div className="brand">
          <span className="brand-mark">JTBD</span>
          <div>
            <p className="eyebrow">Перевод книги</p>
            <h1>Когда кофе и капуста конкурируют</h1>
          </div>
        </div>

        <label className="search-wrap">
          <span>Поиск</span>
          <input
            type="search"
            placeholder="Работа, прогресс, конкуренция..."
            value={query}
            onChange={(event) => {
              const value = event.target.value;
              setQuery(value);
              if (value.trim()) {
                trackOnce(yandexMetrikaGoals.searchUsed, reportedGoalsRef.current);
              }
            }}
          />
        </label>

        <div className="library-meta">
          <span>{docs.length} файлов</span>
          <span>~{wordTotal} тыс. слов</span>
        </div>

        <nav className="chapter-list" aria-label="Главы">
          {filteredDocs.map((doc) => (
            <ChapterCard
              active={doc.index === activeIndex}
              doc={doc}
              href={getChapterPath(doc.slug)}
              key={doc.file}
              onOpen={() => openChapter(doc.index)}
              query={query}
            />
          ))}
        </nav>

        <div className="translator-credit">
          <span>Перевод и подготовка</span>
          <a
            href="https://t.me/mark0vartem"
            target="_blank"
            rel="noreferrer"
            onClick={() => reachYandexMetrikaGoal(yandexMetrikaGoals.telegramClick)}
          >
            @mark0vartem
          </a>
          <p>Нашли ошибку в переводе? Напишите, обновлю.</p>
        </div>
      </aside>

      <main className="reader">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            type="button"
            aria-label="Открыть оглавление"
            title="Оглавление"
            onClick={() => setIsLibraryOpen(true)}
          >
            <span />
            <span />
            <span />
          </button>

          <div className="current">
            <span>{currentDoc.kind}</span>
            <strong>{currentDoc.title}</strong>
          </div>

          <div className="tools" aria-label="Настройки чтения">
            <button
              className="tool-button font-tool smaller"
              type="button"
              title="Уменьшить текст"
              aria-label="Уменьшить текст"
              onClick={() => setFontSize((value) => clamp(value - 1, 16, 24))}
            >
              <span>A</span>
            </button>
            <button
              className="tool-button font-tool larger"
              type="button"
              title="Увеличить текст"
              aria-label="Увеличить текст"
              onClick={() => setFontSize((value) => clamp(value + 1, 16, 24))}
            >
              <span>A</span>
            </button>
            <button
              className="tool-button"
              type="button"
              title="Сменить тему"
              aria-label="Сменить тему"
              aria-pressed={theme === "night"}
              onClick={() => setTheme((value) => (value === "night" ? "" : "night"))}
            >
              ◐
            </button>
          </div>
        </header>

        <div className="progress-track" aria-hidden="true">
          <span style={{ width: `${readProgress}%` }} />
        </div>

        <section className="hero" id="hero">
          <div>
            <p className="eyebrow">Jobs to be Done</p>
            <h2>
              Книга о том, почему люди «нанимают» продукты, когда хотят сдвинуть
              жизнь вперёд.
            </h2>
          </div>
          <div className="cover-stack" aria-label="Обложка книги">
            <Image
              src={bookAssetUrl("/cover.png")}
              alt="Обложка When Coffee and Kale Compete"
              width={150}
              height={200}
              priority
            />
            <div className="hero-stats">
              <span>
                <strong>15</strong> глав
              </span>
              <span>
                <strong>3</strong> приложения
              </span>
              <span>
                <strong>53k</strong> слов
              </span>
            </div>
          </div>
        </section>

        <section className="workspace">
          <aside className="section-rail" aria-label="Разделы главы">
            {sections.map((section) => (
              <a
                className={section.id === activeSection ? "active" : ""}
                href={`#${section.id}`}
                key={section.id}
              >
                {section.title}
              </a>
            ))}
          </aside>
          <article
            className="book-page"
            ref={contentRef}
            aria-live="polite"
            dangerouslySetInnerHTML={{ __html: chapterHtml }}
          />
        </section>

        <footer className="pager">
          {activeIndex > 0 ? (
            <Link
              href={getChapterPath(docs[activeIndex - 1].slug)}
              onClick={() => openChapter(activeIndex - 1)}
            >
              ← Предыдущая
            </Link>
          ) : (
            <span aria-disabled="true">← Предыдущая</span>
          )}
          {activeIndex < docs.length - 1 ? (
            <Link
              href={getChapterPath(docs[activeIndex + 1].slug)}
              onClick={() => openChapter(activeIndex + 1)}
            >
              Следующая →
            </Link>
          ) : (
            <span aria-disabled="true">Следующая →</span>
          )}
        </footer>
      </main>

      <button
        className={`scrim ${isLibraryOpen ? "open" : ""}`}
        type="button"
        aria-label="Закрыть оглавление"
        onClick={() => setIsLibraryOpen(false)}
      />
    </div>
  );
}

function HighlightedText({ query, value }: { query: string; value: string }) {
  const clean = query.trim();
  if (!clean) return value;

  const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = value.split(new RegExp(`(${escaped})`, "ig"));

  return parts.map((part, index) =>
    part.toLowerCase() === clean.toLowerCase() ? (
      <mark key={`${part}-${index}`}>{part}</mark>
    ) : (
      part
    )
  );
}

function ChapterCard({
  active,
  doc,
  href,
  onOpen,
  query
}: {
  active: boolean;
  doc: BookChapter;
  href: string;
  onOpen: () => void;
  query: string;
}) {
  const matchCount = countSearchMatches(doc.raw, query);

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`chapter-card ${active ? "active" : ""}`}
      onClick={onOpen}
      href={href}
    >
      <span className="chapter-index">{doc.label}</span>
      <span className="chapter-info">
        <strong>
          <HighlightedText query={query} value={doc.title} />
        </strong>
        <span className="chapter-meta">
          {doc.kind} · {doc.words.toLocaleString("ru-RU")} слов
        </span>
        {matchCount > 0 ? (
          <span className="chapter-match-count">{formatMentionCount(matchCount)}</span>
        ) : null}
      </span>
    </Link>
  );
}

function trackChapterView(doc: BookChapter): void {
  const params = {
    chapter_file: doc.file,
    chapter_index: doc.index,
    chapter_kind: doc.kind,
    chapter_title: doc.title
  };

  sendYandexMetrikaHit(
    createChapterAnalyticsUrl(doc.file),
    `${doc.title} | Читалка`,
    params
  );
}

function trackReadingProgress(
  doc: BookChapter,
  docs: BookChapter[],
  progress: number,
  reportedGoals: Set<string>
): void {
  trackBookStarted(doc, docs, progress, reportedGoals);
  trackChapterRead(doc, docs, progress, reportedGoals);
}

function trackBookStarted(
  doc: BookChapter,
  docs: BookChapter[],
  progress: number,
  reportedGoals: Set<string>
): void {
  if (
    !isMainBookChapter(doc) ||
    progress < bookStartedProgressThreshold ||
    readStore(bookStartedStoreKey)
  ) {
    return;
  }

  const params = createReadingAnalyticsParams(doc, docs, getReadChapterFiles(docs), progress);
  writeStore(bookStartedStoreKey, "1");
  reportedGoals.add(yandexMetrikaGoals.bookStarted);
  reachYandexMetrikaGoal(yandexMetrikaGoals.bookStarted, params);
  sendYandexMetrikaUserParams(createReaderUserParams(params));
}

function trackChapterRead(
  doc: BookChapter,
  docs: BookChapter[],
  progress: number,
  reportedGoals: Set<string>
): void {
  if (!isMainBookChapter(doc) || progress < chapterReadProgressThreshold) return;

  const storedReadChapters = getReadChapterFiles(docs);
  if (storedReadChapters.includes(doc.file)) return;

  const nextReadChapters = sortReadChapterFiles([...storedReadChapters, doc.file], docs);
  writeReadChapterFiles(nextReadChapters);

  const params = createReadingAnalyticsParams(doc, docs, nextReadChapters, progress);
  reportedGoals.add(`${doc.file}:${yandexMetrikaGoals.chapterRead}`);
  reachYandexMetrikaGoal(yandexMetrikaGoals.chapterRead, params);
  sendYandexMetrikaUserParams(createReaderUserParams(params));

  if (
    nextReadChapters.length === getMainBookChapters(docs).length &&
    !readStore(bookCompletedStoreKey)
  ) {
    writeStore(bookCompletedStoreKey, "1");
    reportedGoals.add(yandexMetrikaGoals.bookCompleted);
    reachYandexMetrikaGoal(yandexMetrikaGoals.bookCompleted, params);
    sendYandexMetrikaUserParams(createReaderUserParams({ ...params, is_book_completed: "yes" }));
  }
}

function createReadingAnalyticsParams(
  doc: BookChapter,
  docs: BookChapter[],
  readChapters: string[],
  progress: number
): Record<string, unknown> {
  const mainChapters = getMainBookChapters(docs);
  const totalMainChapters = mainChapters.length;
  const chaptersReadCount = readChapters.length;

  return {
    book_id: bookAnalyticsId,
    reader_id: getReaderId(),
    chapter_file: doc.file,
    chapter_index: doc.index,
    chapter_kind: "main",
    chapter_label: doc.label,
    chapter_number: getChapterNumber(doc.file),
    chapter_title: doc.title,
    progress,
    chapters_read_count: chaptersReadCount,
    total_main_chapters_count: totalMainChapters,
    book_read_percent: totalMainChapters
      ? Math.round((chaptersReadCount / totalMainChapters) * 100)
      : 0,
    read_chapters: createReadChaptersValue(readChapters),
    is_book_completed:
      totalMainChapters > 0 && chaptersReadCount === totalMainChapters ? "yes" : "no"
  };
}

function createReaderUserParams(params: Record<string, unknown>): Record<string, unknown> {
  return {
    UserID: params.reader_id,
    book_id: params.book_id,
    chapters_read_count: params.chapters_read_count,
    book_read_percent: params.book_read_percent,
    last_read_chapter: params.chapter_file,
    read_chapters: params.read_chapters,
    is_book_completed: params.is_book_completed
  };
}

function getReadChapterFiles(docs: BookChapter[]): string[] {
  const raw = readStore(readChaptersStoreKey);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return sortReadChapterFiles(
        parsed.filter((value): value is string => typeof value === "string"),
        docs
      );
    }
  } catch {
    return sortReadChapterFiles(raw.split(",").map((value) => value.trim()), docs);
  }

  return [];
}

function writeReadChapterFiles(chapterFiles: string[]): void {
  writeStore(readChaptersStoreKey, JSON.stringify(chapterFiles));
}

function sortReadChapterFiles(chapterFiles: string[], docs: BookChapter[]): string[] {
  const mainChapterOrder = new Map(
    getMainBookChapters(docs).map((doc, index) => [doc.file, index])
  );

  return [...new Set(chapterFiles)]
    .filter((file) => mainChapterOrder.has(file))
    .sort((left, right) => {
      const leftOrder = mainChapterOrder.get(left) ?? 0;
      const rightOrder = mainChapterOrder.get(right) ?? 0;
      return leftOrder - rightOrder;
    });
}

function getMainBookChapters(docs: BookChapter[]): BookChapter[] {
  return docs.filter(isMainBookChapter);
}

function isMainBookChapter(doc: BookChapter): boolean {
  return mainChapterPattern.test(doc.file);
}

function getChapterNumber(chapterFile: string): number {
  return Number(chapterFile.match(mainChapterPattern)?.[1] || 0);
}

function createReadChaptersValue(chapterFiles: string[]): string {
  return chapterFiles
    .map((file) => file.match(mainChapterPattern)?.[1] || file)
    .join(",");
}

function getReaderId(): string {
  const savedId = readStore(readerIdStoreKey);
  if (savedId) return savedId;

  const nextId =
    typeof window !== "undefined" && window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  writeStore(readerIdStoreKey, nextId);
  return nextId;
}

function trackOnce(
  goal: (typeof yandexMetrikaGoals)[keyof typeof yandexMetrikaGoals],
  reportedGoals: Set<string>
): void {
  if (reportedGoals.has(goal)) return;

  reportedGoals.add(goal);
  reachYandexMetrikaGoal(goal);
}

function createChapterAnalyticsUrl(chapterFile: string): string {
  if (typeof window === "undefined") {
    return `/?chapter=${encodeURIComponent(chapterFile)}`;
  }

  const url = new URL(window.location.href);
  url.searchParams.set("chapter", chapterFile);
  url.hash = "";

  return `${url.pathname}${url.search}`;
}

function filterDocs(docs: BookChapter[], query: string): BookChapter[] {
  const clean = query.trim();
  if (!clean) return docs;
  return docs.filter((doc) => countSearchMatches(doc.raw, clean) > 0);
}

function countSearchMatches(value: string, query: string): number {
  const clean = query.trim();
  if (!clean) return 0;

  const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return value.match(new RegExp(escaped, "gi"))?.length || 0;
}

function formatMentionCount(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) return `${count} упоминание`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} упоминания`;
  }
  return `${count} упоминаний`;
}

function readStore(key: string): string | null {
  if (typeof window === "undefined") return memoryStore.get(key) || null;

  try {
    return window.localStorage.getItem(key);
  } catch {
    return memoryStore.get(key) || null;
  }
}

function writeStore(key: string, value: string): void {
  if (typeof window === "undefined") {
    memoryStore.set(key, value);
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    memoryStore.set(key, value);
  }
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
