import { z } from 'zod';
import type { Article } from './news.ts';
export const scriptSchema = z.object({
  title: z.string(),
  claims: z.array(
    z.object({
      narration: z.string(),
      evidence: z.array(z.object({ articleId: z.string(), quote: z.string() })),
    }),
  ),
});
export type EpisodeScript = z.infer<typeof scriptSchema>;
export function validateEvidence(script: EpisodeScript, articles: Article[]): void {
  if (!script.title.trim() || script.claims.length < 2) throw new Error('Roteiro incompleto.');
  const byId = new Map(articles.map((article) => [article.id, article]));
  const used = new Set<string>();
  const normalize = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase();
  for (const claim of script.claims) {
    if (!claim.narration.trim() || !claim.evidence.length)
      throw new Error('Afirmação sem evidência.');
    for (const evidence of claim.evidence) {
      const article = byId.get(evidence.articleId);
      if (
        !article ||
        evidence.quote.trim().length < 25 ||
        !normalize(article.content).includes(normalize(evidence.quote))
      )
        throw new Error('Evidência ausente, alterada ou vinculada a fonte desconhecida.');
      used.add(evidence.articleId);
    }
  }
  if (new Set([...used].map((id) => byId.get(id)!.publisherDomain)).size < 2)
    throw new Error('O roteiro precisa usar pelo menos dois veículos distintos.');
}
export function narrationText(script: EpisodeScript): string {
  return `${script.claims.map((claim) => claim.narration).join(' ')} Você pode consultar as fontes deste episódio no aplicativo.`.trim();
}
export function publicEpisode(
  script: EpisodeScript,
  articles: Article[],
  audioPath: string,
  generatedAt: Date,
  expiresAt: Date,
  duration: number,
) {
  const usedIds = new Set(
    script.claims.flatMap((claim) => claim.evidence.map((item) => item.articleId)),
  );
  return {
    title: script.title,
    generatedAt: generatedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    duration,
    audioPath,
    sources: articles
      .filter((article) => usedIds.has(article.id))
      .map(({ id, title, url, publishedAt, publisher }) => ({
        id,
        title,
        url,
        publishedAt,
        publisher,
      })),
  };
}
