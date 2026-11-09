import { createHash } from 'node:crypto';
export const NEWS_WINDOW_MS = 72 * 60 * 60 * 1000;
export type Article = {
  id: string;
  title: string;
  content: string;
  url: string;
  publishedAt: string;
  publisher: string;
  publisherDomain: string;
  editorialGroup?: string;
  originGroup?: string;
};
/** Datas de publicação precisam de horário e fuso explícitos; Date.parse sozinho normaliza datas impossíveis. */
export function publicationTime(value: string): number {
  const parts =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.exec(
      value,
    );
  if (!parts) return NaN;
  const [, year, month, day, hour, minute, second, zone] = parts;
  const days = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
  if (
    Number(month) < 1 ||
    Number(month) > 12 ||
    Number(day) < 1 ||
    Number(day) > days ||
    Number(hour) > 23 ||
    Number(minute) > 59 ||
    Number(second) > 59
  )
    return NaN;
  if (
    zone !== 'Z' &&
    (Number(zone!.slice(1, 3)) > 14 ||
      Number(zone!.slice(4)) > 59 ||
      (Number(zone!.slice(1, 3)) === 14 && Number(zone!.slice(4)) !== 0))
  )
    return NaN;
  return Date.parse(value);
}
export function isRecent(publishedAt: string, now: Date): boolean {
  const published = publicationTime(publishedAt);
  return (
    Number.isFinite(published) &&
    published <= now.getTime() &&
    published >= now.getTime() - NEWS_WINDOW_MS
  );
}
export function canonicalUrl(value: string): string {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('URL de notícia inválida.');
  if (url.username || url.password) throw new Error('URL de notícia inválida.');
  url.hash = '';
  for (const key of [...url.searchParams.keys()])
    if (
      key.toLowerCase().startsWith('utm_') ||
      ['fbclid', 'gclid', 'msclkid'].includes(key.toLowerCase())
    )
      url.searchParams.delete(key);
  url.searchParams.sort();
  url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  return url.pathname === '/' && !url.search ? url.toString().slice(0, -1) : url.toString();
}
export function articleId(url: string): string {
  return createHash('sha256').update(canonicalUrl(url)).digest('hex').slice(0, 20);
}
function normalized(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}
function similar(a: string, b: string): boolean {
  const aWords = new Set(normalized(a).split(' '));
  const bWords = new Set(normalized(b).split(' '));
  return (
    [...aWords].filter((word) => bWords.has(word)).length / Math.max(aWords.size, bWords.size) >=
    0.85
  );
}
/** @deprecated Filtro básico da primeira prova. Para novas coletas, usar collectNews/selectNews, com cadastro e relatório. */
export function selectArticles(articles: Article[], now: Date, max = 6): Article[] {
  const eligible = articles
    .filter((article) => isRecent(article.publishedAt, now) && article.content.trim().length >= 500)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  const unique: Article[] = [];
  for (const article of eligible) {
    let url: string;
    try {
      url = canonicalUrl(article.url);
    } catch {
      continue;
    }
    if (
      !unique.some(
        (other) =>
          canonicalUrl(other.url) === url ||
          similar(other.title, article.title) ||
          similar(other.content.slice(0, 800), article.content.slice(0, 800)),
      )
    )
      unique.push({ ...article, url });
  }
  const diverse: Article[] = [];
  const domains = new Set<string>();
  for (const article of unique) {
    if (!domains.has(article.publisherDomain)) {
      diverse.push(article);
      domains.add(article.publisherDomain);
    }
    if (diverse.length >= max) break;
  }
  for (const article of unique) {
    if (diverse.length >= max) break;
    if (!diverse.includes(article)) diverse.push(article);
  }
  return diverse;
}
export function independentSourceCount(articles: Article[]): number {
  // Fontes ligadas pelo mesmo grupo editorial OU agência não contam como confirmações separadas.
  let components: Set<string>[] = [];
  for (const article of articles) {
    const identities = new Set(
      article.editorialGroup
        ? [
            `editorial:${article.editorialGroup}`,
            `origin:${article.originGroup || article.editorialGroup}`,
          ]
        : [`domain:${article.publisherDomain}`],
    );
    const related = components.filter((group) =>
      [...identities].some((identity) => group.has(identity)),
    );
    for (const group of related) for (const identity of group) identities.add(identity);
    components = components.filter((group) => !related.includes(group));
    components.push(identities);
  }
  return components.length;
}
export function assertSufficientSources(articles: Article[]): void {
  if (articles.length < 2 || independentSourceCount(articles) < 2)
    throw new Error(
      'Notícias recentes e fontes independentes insuficientes. A janela de 72 horas não será ampliada.',
    );
}
export function episodeExpiresAt(articles: Article[], generatedAt: Date): Date {
  if (!articles.length || articles.some((article) => !isRecent(article.publishedAt, generatedAt)))
    throw new Error('Uma fonte expirou antes da conclusão do episódio. Busque notícias novamente.');
  return new Date(
    Math.min(
      generatedAt.getTime() + 3600000,
      ...articles.map((article) => Date.parse(article.publishedAt) + NEWS_WINDOW_MS),
    ),
  );
}
