const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function bookAssetUrl(value: string): string {
  const normalized = value.startsWith("/") ? value : `/${value}`;
  return `${basePath}${normalized}`;
}

export function createDefaultFigureImageMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (let figure = 1; figure <= 36; figure += 1) {
    map[String(figure)] = bookAssetUrl(`/images/imageFile${figure + 1}.png`);
  }
  return map;
}

export function createBookHtml(markdown: string): string {
  return markdownToHtml(injectFigureImages(markdown, createDefaultFigureImageMap()));
}

export function injectFigureImages(
  markdown: string,
  figureImageMap: Record<string, string>
): string {
  const existingFigures = new Set(
    [...markdown.matchAll(/!\[[^\]]*(?:Рис\.|Figure)\s*(\d+)/gi)].map((match) => match[1])
  );
  const insertedFigures = new Set<string>();

  return markdown.replace(/^(\*\*Рис\.\s*(\d+)[^\n]*)$/gm, (match, line, figureNumber) => {
    const imageSrc = figureImageMap[figureNumber];
    if (!imageSrc || existingFigures.has(figureNumber) || insertedFigures.has(figureNumber)) {
      return match;
    }

    insertedFigures.add(figureNumber);
    return `![Рис. ${figureNumber}](${imageSrc})\n\n${line}`;
  });
}

export function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let list: "ul" | "ol" | null = null;
  let quote: string[] = [];

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
      const listItem = unordered?.[1] ?? ordered?.[1] ?? "";
      if (list !== type) {
        closeList();
        html.push(`<${type}>`);
        list = type;
      }
      html.push(`<li>${inline(listItem)}</li>`);
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

export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/!\[[^\]]*]\((?:<[^>]+>|[^)]+)\)/g, " ")
    .replace(/\[([^\]]+)]\((?:<[^>]+>|[^)]+)\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function createTextExcerpt(markdown: string, maxLength = 158): string {
  const plain = markdownToPlainText(markdown);
  if (plain.length <= maxLength) return plain;

  const clipped = plain.slice(0, maxLength - 1);
  const sentenceEnd = Math.max(clipped.lastIndexOf("."), clipped.lastIndexOf("!"), clipped.lastIndexOf("?"));
  const softEnd = sentenceEnd > 80 ? sentenceEnd + 1 : clipped.lastIndexOf(" ");
  return `${clipped.slice(0, softEnd > 80 ? softEnd : clipped.length).trim()}...`;
}

function parseImageLine(line: string): { alt: string; src: string } | null {
  const match = line.match(/^!\[([^\]]*)]\((?:<([^>]+)>|([^)]+))\)$/);
  if (!match) return null;

  return {
    alt: match[1],
    src: match[2] || match[3]
  };
}

function findFollowingFigureCaption(
  lines: string[],
  imageLineIndex: number
): { index: number; text: string } | null {
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

function normalizeFigureCaption(line: string): string {
  return line
    .replace(/^\*\*(Рис\.\s*\d+\.?)\*\*\s*/, "$1 ")
    .replace(/^\*\*/, "")
    .replace(/\*\*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function renderFigure(src: string, alt: string, caption = ""): string {
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

function inline(value: string): string {
  const links: string[] = [];
  const createLink = (href: string, text = href) => {
    const token = `@@LINK_${links.length}@@`;
    links.push(
      `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${text}</a>`
    );
    return token;
  };

  const linked = escapeHtml(value)
    .replace(/\[([^\]]+)]\((https?:\/\/[^)\s]+)\)/g, (_match, text, href) =>
      createLink(href, text)
    )
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
