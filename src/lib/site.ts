export const defaultSiteUrl = "https://kartbllansh.github.io/TranslateJTBDBook";

export const siteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

export function absoluteSiteUrl(pathname = "/"): string {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return normalizedPath === "/" ? `${siteUrl}/` : `${siteUrl}${normalizedPath}`;
}

function normalizeSiteUrl(value: string | undefined): string {
  const clean = value?.trim() || defaultSiteUrl;
  return clean.replace(/\/+$/, "");
}
