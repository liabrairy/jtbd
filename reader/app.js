const chapters = window.EMBEDDED_CHAPTERS || [
  { file: "00_translator_note.md", label: "T", kind: "От переводчика" },
  { file: "00_foreword.md", label: "00", kind: "Вступление" },
  { file: "00_acknowledgments.md", label: "00", kind: "Вступление" },
  { file: "01_chapter.md", label: "01", kind: "Часть I" },
  { file: "02_chapter.md", label: "02", kind: "Часть I" },
  { file: "03_chapter.md", label: "03", kind: "Часть I" },
  { file: "04_chapter.md", label: "04", kind: "Кейс" },
  { file: "05_chapter.md", label: "05", kind: "Кейс" },
  { file: "06_chapter.md", label: "06", kind: "Часть II" },
  { file: "07_chapter.md", label: "07", kind: "Часть II" },
  { file: "08_chapter.md", label: "08", kind: "Кейс" },
  { file: "09_chapter.md", label: "09", kind: "Кейс" },
  { file: "10_chapter.md", label: "10", kind: "Кейс" },
  { file: "11_chapter.md", label: "11", kind: "Часть III" },
  { file: "12_chapter.md", label: "12", kind: "Часть III" },
  { file: "13_chapter.md", label: "13", kind: "Практика" },
  { file: "14_chapter.md", label: "14", kind: "Финал" },
  { file: "15_chapter.md", label: "15", kind: "Финал" },
  { file: "15_appendix.md", label: "A15", kind: "Приложение" },
  { file: "16_appendix.md", label: "A16", kind: "Приложение" },
  { file: "17_appendix.md", label: "A17", kind: "Приложение" },
  { file: "18_notes.md", label: "N18", kind: "Примечания" }
];

const figureImageMap = window.FIGURE_IMAGE_MAP || createDefaultFigureImageMap();
const yandexMetrikaId = normalizeYandexMetrikaId(window.YANDEX_METRIKA_ID || "109588087");
const yandexMetrikaGoals = {
  bookStarted: "book_started",
  chapterRead: "chapter_read",
  bookCompleted: "book_completed",
  searchUsed: "search_used",
  telegramClick: "telegram_click"
};
const bookAnalyticsId = "when-coffee-and-kale-compete-ru";
const bookCompletedStoreKey = "reader:book-completed:v1";
const bookStartedProgressThreshold = 10;
const bookStartedStoreKey = "reader:book-started:v1";
const chapterReadProgressThreshold = 95;
const mainChapterPattern = /^(\d{2})_chapter\.md$/;
const readChaptersStoreKey = "reader:read-chapters:v1";
const readerIdStoreKey = "reader:id:v1";
const reportedGoals = new Set();

const els = {
  chapterList: document.querySelector("#chapterList"),
  sectionRail: document.querySelector("#sectionRail"),
  content: document.querySelector("#content"),
  searchInput: document.querySelector("#searchInput"),
  currentKicker: document.querySelector("#currentKicker"),
  currentTitle: document.querySelector("#currentTitle"),
  readProgress: document.querySelector("#readProgress"),
  prevChapter: document.querySelector("#prevChapter"),
  nextChapter: document.querySelector("#nextChapter"),
  themeToggle: document.querySelector("#themeToggle"),
  increaseFont: document.querySelector("#increaseFont"),
  decreaseFont: document.querySelector("#decreaseFont"),
  menuButton: document.querySelector("#menuButton"),
  library: document.querySelector("#library"),
  scrim: document.querySelector("#scrim"),
  chapterCount: document.querySelector("#chapterCount"),
  wordCount: document.querySelector("#wordCount")
};

const store = createStore();
let activeIndex = Number(store.get("reader:chapter") || 0);
let docs = [];
let sectionObserver;
const savedTheme = store.get("reader:theme");
const savedFont = Number(store.get("reader:font") || 19);

document.documentElement.dataset.theme = savedTheme || "";
document.documentElement.style.setProperty("--reader-size", `${savedFont}px`);

initYandexMetrika();
init();

async function init() {
  docs = await Promise.all(chapters.map(loadChapter));
  activeIndex = Math.min(Math.max(activeIndex, 0), docs.length - 1);
  els.chapterCount.textContent = `${docs.length} файлов`;
  els.wordCount.textContent = `~${Math.round(countWords(docs.map((doc) => doc.raw).join(" ")) / 1000)} тыс. слов`;
  renderChapterList(docs);
  openChapter(activeIndex, { restoreScroll: true });
  bindEvents();
}

async function loadChapter(chapter, index) {
  if (typeof chapter.raw === "string") {
    const raw = injectFigureImages(chapter.raw);
    const title = chapter.title || (raw.match(/^#\s+(.+)$/m) || [null, chapter.file])[1];
    const words = chapter.words || countWords(raw);
    return { ...chapter, index, raw, title, words };
  }

  const response = await fetch(`../translated/${chapter.file}`);
  if (!response.ok) {
    throw new Error(`Не удалось загрузить ${chapter.file}`);
  }
  const raw = injectFigureImages(await response.text());
  const title = (raw.match(/^#\s+(.+)$/m) || [null, chapter.file])[1];
  const words = countWords(raw);
  return { ...chapter, index, raw, title, words };
}

function bindEvents() {
  els.searchInput.addEventListener("input", () => {
    renderChapterList(filterDocs(els.searchInput.value));
    if (els.searchInput.value.trim()) {
      trackGoalOnce(yandexMetrikaGoals.searchUsed);
    }
  });
  els.prevChapter.addEventListener("click", () => openChapter(activeIndex - 1));
  els.nextChapter.addEventListener("click", () => openChapter(activeIndex + 1));
  els.themeToggle.addEventListener("click", toggleTheme);
  els.increaseFont.addEventListener("click", () => adjustFont(1));
  els.decreaseFont.addEventListener("click", () => adjustFont(-1));
  els.menuButton.addEventListener("click", toggleLibrary);
  els.scrim.addEventListener("click", closeLibrary);
  document
    .querySelector(".translator-credit a")
    ?.addEventListener("click", () => reachYandexMetrikaGoal(yandexMetrikaGoals.telegramClick));
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("beforeunload", saveReadingPosition);
}

function renderChapterList(items) {
  const query = els.searchInput.value.trim();
  els.chapterList.innerHTML = "";
  items.forEach((doc) => {
    const matchCount = countSearchMatches(doc.raw, query);
    const button = document.createElement("button");
    button.className = `chapter-card ${doc.index === activeIndex ? "active" : ""}`;
    button.type = "button";
    button.innerHTML = `
      <span class="chapter-index">${doc.label}</span>
      <span class="chapter-info">
        <strong>${highlight(escapeHtml(doc.title), query)}</strong>
        <span class="chapter-meta">${doc.kind} · ${doc.words.toLocaleString("ru-RU")} слов</span>
        ${matchCount > 0 ? `<span class="chapter-match-count">${formatMentionCount(matchCount)}</span>` : ""}
      </span>
    `;
    button.addEventListener("click", () => {
      openChapter(doc.index);
      closeLibrary();
    });
    els.chapterList.appendChild(button);
  });
}

function openChapter(index, options = {}) {
  if (index < 0 || index >= docs.length) return;

  saveReadingPosition();
  activeIndex = index;
  const doc = docs[activeIndex];
  store.set("reader:chapter", String(activeIndex));
  els.currentKicker.textContent = doc.kind;
  els.currentTitle.textContent = doc.title;
  document.title = `${doc.title} | Читалка`;
  els.content.innerHTML = markdownToHtml(doc.raw);
  trackChapterView(doc);
  renderSections();
  renderChapterList(filterDocs(els.searchInput.value));
  els.prevChapter.disabled = activeIndex === 0;
  els.nextChapter.disabled = activeIndex === docs.length - 1;

  if (options.restoreScroll) {
    const y = Number(store.get(`reader:scroll:${doc.file}`) || 0);
    setTimeout(() => window.scrollTo({ top: y, behavior: "auto" }), 0);
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  setTimeout(updateProgress, 60);
}

function renderSections() {
  if (sectionObserver) sectionObserver.disconnect();
  const headings = [...els.content.querySelectorAll("h2, h3")];
  els.sectionRail.innerHTML = "";

  headings.forEach((heading, index) => {
    const id = `section-${activeIndex}-${index}`;
    heading.id = id;
    const link = document.createElement("a");
    link.href = `#${id}`;
    link.textContent = heading.textContent;
    els.sectionRail.appendChild(link);
  });

  sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const link = els.sectionRail.querySelector(`[href="#${entry.target.id}"]`);
      els.sectionRail.querySelectorAll("a").forEach((item) => item.classList.remove("active"));
      if (link) link.classList.add("active");
    });
  }, { rootMargin: "-20% 0px -70% 0px" });

  headings.forEach((heading) => sectionObserver.observe(heading));
}

function injectFigureImages(markdown) {
  const existingFigures = new Set(
    [...markdown.matchAll(/!\[[^\]]*(?:Рис\.|Figure)\s*(\d+)/gi)].map((match) => match[1])
  );
  const insertedFigures = new Set();

  return markdown.replace(/^(\*\*Рис\.\s*(\d+)[^\n]*)$/gm, (match, line, figureNumber) => {
    const imageSrc = figureImageMap[figureNumber];
    if (!imageSrc || existingFigures.has(figureNumber) || insertedFigures.has(figureNumber)) {
      return match;
    }

    insertedFigures.add(figureNumber);
    return `![Рис. ${figureNumber}](${imageSrc})\n\n${line}`;
  });
}

function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let list = null;
  let quote = [];

  const closeList = () => {
    if (!list) return;
    html.push(`</${list}>`);
    list = null;
  };
  const closeQuote = () => {
    if (!quote.length) return;
    html.push(`<blockquote>${quote.map((line) => `<p>${inline(line)}</p>`).join("")}</blockquote>`);
    quote = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();
    if (!trimmed) {
      closeList();
      closeQuote();
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      closeList();
      closeQuote();
      html.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`);
      continue;
    }

    const image = parseImageLine(trimmed);
    if (image) {
      closeList();
      closeQuote();
      const caption = findFollowingFigureCaption(lines, index);
      if (caption) {
        html.push(renderFigure(image.src, image.alt, caption.text));
        index = caption.index;
      } else {
        html.push(renderFigure(image.src, image.alt));
      }
      continue;
    }

    if (trimmed.startsWith(">")) {
      closeList();
      quote.push(trimmed.replace(/^>\s?/, ""));
      continue;
    }

    const unordered = trimmed.match(/^[-*]\s+(.+)$/);
    const ordered = trimmed.match(/^\d+\.\s+(.+)$/);
    if (unordered || ordered) {
      closeQuote();
      const type = unordered ? "ul" : "ol";
      if (list !== type) {
        closeList();
        html.push(`<${type}>`);
        list = type;
      }
      html.push(`<li>${inline((unordered || ordered)[1])}</li>`);
      continue;
    }

    closeList();
    closeQuote();
    html.push(`<p>${inline(trimmed)}</p>`);
  }

  closeList();
  closeQuote();
  return html.join("\n");
}

function parseImageLine(line) {
  const match = line.match(/^!\[([^\]]*)]\((?:<([^>]+)>|([^)]+))\)$/);
  if (!match) return null;
  return {
    alt: match[1],
    src: match[2] || match[3]
  };
}

function findFollowingFigureCaption(lines, imageLineIndex) {
  let index = imageLineIndex + 1;
  while (index < lines.length && !lines[index].trim()) {
    index += 1;
  }

  const line = lines[index]?.trim();
  if (!line || !/^\*\*Рис\.\s*\d+/.test(line)) return null;
  return {
    index,
    text: normalizeFigureCaption(line)
  };
}

function normalizeFigureCaption(line) {
  return line
    .replace(/^\*\*(Рис\.\s*\d+\.?)\*\*\s*/, "$1 ")
    .replace(/^\*\*/, "")
    .replace(/\*\*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function renderFigure(src, alt, caption = "") {
  const fallbackAlt = caption || alt || "Иллюстрация";
  return `
    <figure class="book-figure">
      <div class="figure-frame">
        <img src="${escapeHtml(src)}" alt="${escapeHtml(fallbackAlt)}" loading="lazy">
      </div>
      ${caption ? `<figcaption>${inline(caption)}</figcaption>` : ""}
    </figure>
  `;
}

function inline(value) {
  const links = [];
  const createLink = (href, text = href) => {
    const token = `@@LINK_${links.length}@@`;
    links.push(`<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`);
    return token;
  };

  const linked = escapeHtml(value)
    .replace(/\[([^\]]+)]\((https?:\/\/[^)\s]+)\)/g, (_match, text, href) => createLink(href, text))
    .replace(/\bhttps?:\/\/[^\s<]+/g, (match) => {
      const punctuation = match.match(/[.,;:!?)]$/)?.[0] || "";
      const href = punctuation ? match.slice(0, -1) : match;
      return `${createLink(href)}${punctuation}`;
    });

  return linked
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/@@LINK_(\d+)@@/g, (_match, index) => links[Number(index)]);
}

function filterDocs(query) {
  const clean = query.trim();
  if (!clean) return docs;
  return docs.filter((doc) => countSearchMatches(doc.raw, clean) > 0);
}

function countSearchMatches(value, query) {
  const clean = query.trim();
  if (!clean) return 0;

  const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return value.match(new RegExp(escaped, "gi"))?.length || 0;
}

function formatMentionCount(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) return `${count} упоминание`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} упоминания`;
  }
  return `${count} упоминаний`;
}

function highlight(value, query) {
  const clean = query.trim();
  if (!clean) return value;
  const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return value.replace(new RegExp(`(${escaped})`, "ig"), "<mark>$1</mark>");
}

function updateProgress() {
  const doc = docs[activeIndex];
  if (!doc) return;

  const page = els.content;
  const rect = page.getBoundingClientRect();
  const total = page.offsetHeight - window.innerHeight * .5;
  const read = Math.min(Math.max(-rect.top, 0), Math.max(total, 1));
  const progress = Math.round((read / Math.max(total, 1)) * 100);
  els.readProgress.style.width = `${progress}%`;
  trackReadingProgress(doc, progress);
}

function initYandexMetrika() {
  if (!yandexMetrikaId) return;

  (function(m, e, t, r, i, k, a) {
    m[i] = m[i] || function() {
      (m[i].a = m[i].a || []).push(arguments);
    };
    m[i].l = 1 * new Date();
    for (let j = 0; j < document.scripts.length; j += 1) {
      if (document.scripts[j].src === r) return;
    }
    k = e.createElement(t);
    a = e.getElementsByTagName(t)[0];
    k.async = 1;
    k.src = r;
    a.parentNode.insertBefore(k, a);
  })(window, document, "script", `https://mc.yandex.ru/metrika/tag.js?id=${yandexMetrikaId}`, "ym");

  window.ym(Number(yandexMetrikaId), "init", {
    ssr: true,
    clickmap: true,
    ecommerce: "dataLayer",
    referrer: document.referrer,
    url: location.href,
    trackLinks: true,
    accurateTrackBounce: true,
    webvisor: true
  });
}

function trackChapterView(doc) {
  const params = {
    chapter_file: doc.file,
    chapter_index: doc.index,
    chapter_kind: doc.kind,
    chapter_title: doc.title
  };

  sendYandexMetrikaHit(createChapterAnalyticsUrl(doc.file), `${doc.title} | Читалка`, params);
}

function trackReadingProgress(doc, progress) {
  trackBookStarted(doc, progress);
  trackChapterRead(doc, progress);
}

function trackBookStarted(doc, progress) {
  if (
    !isMainBookChapter(doc) ||
    progress < bookStartedProgressThreshold ||
    store.get(bookStartedStoreKey)
  ) {
    return;
  }

  const params = createReadingAnalyticsParams(doc, getReadChapterFiles(), progress);
  store.set(bookStartedStoreKey, "1");
  reportedGoals.add(yandexMetrikaGoals.bookStarted);
  reachYandexMetrikaGoal(yandexMetrikaGoals.bookStarted, params);
  sendYandexMetrikaUserParams(createReaderUserParams(params));
}

function trackChapterRead(doc, progress) {
  if (!isMainBookChapter(doc) || progress < chapterReadProgressThreshold) return;

  const storedReadChapters = getReadChapterFiles();
  if (storedReadChapters.includes(doc.file)) return;

  const nextReadChapters = sortReadChapterFiles([...storedReadChapters, doc.file]);
  writeReadChapterFiles(nextReadChapters);

  const params = createReadingAnalyticsParams(doc, nextReadChapters, progress);
  reportedGoals.add(`${doc.file}:${yandexMetrikaGoals.chapterRead}`);
  reachYandexMetrikaGoal(yandexMetrikaGoals.chapterRead, params);
  sendYandexMetrikaUserParams(createReaderUserParams(params));

  if (
    nextReadChapters.length === getMainBookChapters().length &&
    !store.get(bookCompletedStoreKey)
  ) {
    store.set(bookCompletedStoreKey, "1");
    reportedGoals.add(yandexMetrikaGoals.bookCompleted);
    reachYandexMetrikaGoal(yandexMetrikaGoals.bookCompleted, params);
    sendYandexMetrikaUserParams(createReaderUserParams({ ...params, is_book_completed: "yes" }));
  }
}

function createReadingAnalyticsParams(doc, readChapters, progress) {
  const mainChapters = getMainBookChapters();
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

function createReaderUserParams(params) {
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

function getReadChapterFiles() {
  const raw = store.get(readChaptersStoreKey);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return sortReadChapterFiles(parsed.filter((value) => typeof value === "string"));
    }
  } catch (error) {
    return sortReadChapterFiles(raw.split(",").map((value) => value.trim()));
  }

  return [];
}

function writeReadChapterFiles(chapterFiles) {
  store.set(readChaptersStoreKey, JSON.stringify(chapterFiles));
}

function sortReadChapterFiles(chapterFiles) {
  const mainChapterOrder = new Map(getMainBookChapters().map((doc, index) => [doc.file, index]));

  return [...new Set(chapterFiles)]
    .filter((file) => mainChapterOrder.has(file))
    .sort((left, right) => {
      const leftOrder = mainChapterOrder.get(left) || 0;
      const rightOrder = mainChapterOrder.get(right) || 0;
      return leftOrder - rightOrder;
    });
}

function getMainBookChapters() {
  return docs.filter(isMainBookChapter);
}

function isMainBookChapter(doc) {
  return mainChapterPattern.test(doc.file);
}

function getChapterNumber(chapterFile) {
  return Number(chapterFile.match(mainChapterPattern)?.[1] || 0);
}

function createReadChaptersValue(chapterFiles) {
  return chapterFiles.map((file) => file.match(mainChapterPattern)?.[1] || file).join(",");
}

function getReaderId() {
  const savedId = store.get(readerIdStoreKey);
  if (savedId) return savedId;

  const nextId = window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  store.set(readerIdStoreKey, nextId);
  return nextId;
}

function sendYandexMetrikaHit(url, title, params = {}) {
  if (!yandexMetrikaId || typeof window.ym !== "function") return;

  window.ym(Number(yandexMetrikaId), "hit", url, {
    title,
    params
  });
}

function reachYandexMetrikaGoal(goal, params = {}) {
  if (!yandexMetrikaId || typeof window.ym !== "function") return;

  window.ym(Number(yandexMetrikaId), "reachGoal", goal, params);
}

function sendYandexMetrikaUserParams(params) {
  if (!yandexMetrikaId || typeof window.ym !== "function") return;

  window.ym(Number(yandexMetrikaId), "userParams", params);
}

function trackGoalOnce(goal) {
  if (reportedGoals.has(goal)) return;

  reportedGoals.add(goal);
  reachYandexMetrikaGoal(goal);
}

function createChapterAnalyticsUrl(chapterFile) {
  const url = new URL(window.location.href);
  url.searchParams.set("chapter", chapterFile);
  url.hash = "";

  return `${url.pathname}${url.search}`;
}

function normalizeYandexMetrikaId(value) {
  return /^\d+$/.test(String(value || "").trim()) ? String(value).trim() : "";
}

function saveReadingPosition() {
  const doc = docs[activeIndex];
  if (!doc) return;
  store.set(`reader:scroll:${doc.file}`, String(Math.max(window.scrollY, 0)));
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === "night" ? "" : "night";
  document.documentElement.dataset.theme = next;
  store.set("reader:theme", next);
}

function adjustFont(delta) {
  const current = Number(getComputedStyle(document.documentElement).getPropertyValue("--reader-size").replace("px", ""));
  const next = Math.min(24, Math.max(16, current + delta));
  document.documentElement.style.setProperty("--reader-size", `${next}px`);
  store.set("reader:font", String(next));
}

function toggleLibrary() {
  els.library.classList.toggle("open");
  els.scrim.classList.toggle("open");
}

function closeLibrary() {
  els.library.classList.remove("open");
  els.scrim.classList.remove("open");
}

function countWords(value) {
  return (value.match(/[A-Za-zА-Яа-яЁё0-9-]+/g) || []).length;
}

function createDefaultFigureImageMap() {
  const map = {};
  for (let figure = 1; figure <= 36; figure += 1) {
    map[String(figure)] = `images/imageFile${figure + 1}.png`;
  }
  return map;
}

function createStore() {
  const memory = new Map();
  try {
    const testKey = "reader:test";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return {
      get: (key) => window.localStorage.getItem(key),
      set: (key, value) => window.localStorage.setItem(key, value)
    };
  } catch (error) {
    return {
      get: (key) => memory.get(key) || null,
      set: (key, value) => memory.set(key, value)
    };
  }
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
