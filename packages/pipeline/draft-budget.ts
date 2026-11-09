import type { DraftInput } from './editorial.ts';
import type { EditorialDraft } from './editorial-schema.ts';
import { independentSourceCount } from '../core/src/news.ts';

const words = (text: string) => text.trim().split(/\s+/).length;
/** Seleciona parágrafos completos; a versão resultante ainda precisa de revisão editorial. */
export function fitDraftBudget(draft: EditorialDraft, input: DraftInput): EditorialDraft {
  if (!draft.sufficient || draft.claims.length > 8) return draft;
  const size = (claims: EditorialDraft['claims']) =>
    words(claims.map((claim) => claim.narration).join(' '));
  if (size(draft.claims) <= input.targetWords + 15) return draft;
  const facts = new Map(input.facts.facts.map((fact) => [fact.id, fact]));
  let best: EditorialDraft['claims'] | null = null,
    distance = Infinity;
  for (let mask = 1; mask < 2 ** draft.claims.length; mask++) {
    const claims = draft.claims.filter((_, index) => mask & (1 << index));
    const count = size(claims);
    if (claims.length < 2 || count < 150 || count > 330) continue;
    const usedFacts = new Set(claims.flatMap((claim) => claim.factIds));
    if (draft.titleFactIds.some((id) => !usedFacts.has(id))) continue;
    const usedArticles = new Set(
      [...usedFacts].flatMap((id) => facts.get(id)?.evidence.map((item) => item.articleId) || []),
    );
    if (
      independentSourceCount(input.articles.filter((article) => usedArticles.has(article.id))) < 2
    )
      continue;
    const delta = Math.abs(count - input.targetWords);
    if (delta < distance) {
      best = claims;
      distance = delta;
    }
  }
  return best ? { ...draft, claims: best } : draft;
}
