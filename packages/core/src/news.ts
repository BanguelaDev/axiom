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
};
export function isRecent(publishedAt: string, now: Date): boolean {
  const published = Date.parse(publishedAt);
  return (
    Number.isFinite(published) &&
    published <= now.getTime() &&
    published >= now.getTime() - NEWS_WINDOW_MS
  );
}
export function canonicalUrl(value: string): string {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('URL de notícia inválida.');
  url.hash = '';
  for (const key of [...url.searchParams.keys()])
    if (key.startsWith('utm_') || ['fbclid', 'gclid'].includes(key)) url.searchParams.delete(key);
  url.searchParams.sort();
  return url.toString().replace(/\/$/, '');
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
export function assertSufficientSources(articles: Article[]): void {
  if (articles.length < 2 || new Set(articles.map((article) => article.publisherDomain)).size < 2)
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
