import { createHash } from 'node:crypto';
import {
  factsSchema,
  draftSchema,
  reviewSchema,
  type FactBundle,
  type EditorialDraft,
  type EditorialReview,
  type ModelResult,
} from './editorial-schema.ts';
import { assertSufficientSources, episodeExpiresAt, type Article } from '../core/src/news.ts';
import { narrationText, validateEvidence, type EpisodeScript } from '../core/src/script.ts';
import type { Topic } from '../core/src/topics.ts';
import {
  editorialFailures,
  type EditorialFailure,
  type EditorialCheck,
} from '../core/src/editorial-report.ts';

export class EditorialFault extends Error {
  constructor(public readonly code: EditorialFailure) {
    super(editorialFailures[code]);
  }
}
export interface EditorialInput {
  topic: Topic;
  articles: Article[];
  referenceAt: string;
}
export interface DraftInput extends EditorialInput {
  facts: FactBundle;
  targetWords: number;
}
export interface ReviewInput extends DraftInput {
  draft: EditorialDraft;
  script: EpisodeScript;
  artifactId: string;
}
export interface EditorialModel {
  extract(input: EditorialInput): Promise<ModelResult>;
  draft(input: DraftInput): Promise<ModelResult>;
  review(input: ReviewInput): Promise<ModelResult>;
}
export interface EditorialContext extends EditorialInput {
  facts: FactBundle;
  sourceDigest: string;
  extractionUsage: ModelResult['usage'];
}
export interface ApprovedEditorial {
  context: EditorialContext;
  targetWords: number;
  draft: EditorialDraft;
  script: EpisodeScript;
  review: EditorialReview;
  artifactId: string;
  checkedAt: string;
  wordCount: number;
  usage: {
    extraction: ModelResult['usage'];
    draft: ModelResult['usage'];
    review: ModelResult['usage'];
  };
}
type Options = { clock?: () => Date; onCheck?: (check: EditorialCheck) => void };
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const literal = (value: string) => value.normalize('NFC').replace(/\s+/g, ' ').trim();
const numbers = (value: string) => value.match(/\d+(?:[.,:/-]\d+)*(?:%)?/g) || [];
function assertNumbers(text: string, evidence: string) {
  const available = new Set(numbers(evidence));
  if (numbers(text).some((value) => !available.has(value)))
    throw new EditorialFault('unsupported_number');
}
function assertSources(articles: Article[], now: Date) {
  if (
    articles.length < 3 ||
    articles.length > 6 ||
    new Set(articles.map((article) => article.id)).size !== articles.length ||
    articles.some((article) => !article.editorialGroup || !article.originGroup)
  )
    throw new EditorialFault('insufficient_sources');
  try {
    assertSufficientSources(articles);
  } catch {
    throw new EditorialFault('insufficient_sources');
  }
  try {
    if (episodeExpiresAt(articles, now).getTime() <= now.getTime()) throw new Error();
  } catch {
    throw new EditorialFault('stale_sources');
  }
  if (JSON.stringify(articles).length > 120_000) throw new EditorialFault('budget_exceeded');
}
function parseFacts(value: unknown, articles: Article[]): FactBundle {
  const parsed = factsSchema.safeParse(value);
  if (!parsed.success) throw new EditorialFault('invalid_structure');
  const result = parsed.data;
  if (!result.sufficient) throw new EditorialFault('insufficient_content');
  if (result.facts.length < 2) throw new EditorialFault('invalid_structure');
  if (new Set(result.facts.map((fact) => fact.id)).size !== result.facts.length)
    throw new EditorialFault('invalid_structure');
  const byId = new Map(articles.map((article) => [article.id, article]));
  const used = new Set<string>();
  for (const fact of result.facts) {
    if (!fact.statement.trim() || (fact.kind !== 'confirmed' && !fact.attribution?.trim()))
      throw new EditorialFault('invalid_structure');
    for (const evidence of fact.evidence) {
      const article = byId.get(evidence.articleId);
      if (
        !article ||
        literal(evidence.quote).length < 25 ||
        !literal(article.content).includes(literal(evidence.quote))
      )
        throw new EditorialFault('invalid_evidence');
      used.add(article.id);
    }
    assertNumbers(fact.statement, fact.evidence.map((evidence) => evidence.quote).join(' '));
  }
  try {
    assertSufficientSources(articles.filter((article) => used.has(article.id)));
  } catch {
    throw new EditorialFault('insufficient_sources');
  }
  return result;
}
function compileDraft(
  value: unknown,
  facts: FactBundle,
): { draft: EditorialDraft; script: EpisodeScript; wordCount: number } {
  const parsed = draftSchema.safeParse(value);
  if (!parsed.success) throw new EditorialFault('invalid_structure');
  const draft = parsed.data;
  if (!draft.sufficient) throw new EditorialFault('insufficient_content');
  if (draft.title.trim().length < 5 || draft.claims.length < 2 || !draft.titleFactIds.length)
    throw new EditorialFault('invalid_structure');
  if (
    !draft.title.trim() ||
    new Set(draft.claims.map((claim) => claim.id)).size !== draft.claims.length
  )
    throw new EditorialFault('invalid_structure');
  const byId = new Map(facts.facts.map((fact) => [fact.id, fact]));
  const used = new Set(draft.claims.flatMap((claim) => claim.factIds));
  if (draft.titleFactIds.some((id) => !byId.has(id) || !used.has(id)))
    throw new EditorialFault('unmapped_claim');
  const claims = draft.claims.map((claim) => {
    if (!claim.narration.trim() || new Set(claim.factIds).size !== claim.factIds.length)
      throw new EditorialFault('unmapped_claim');
    const linked = claim.factIds.map((id) => {
      const fact = byId.get(id);
      if (!fact) throw new EditorialFault('unmapped_claim');
      return fact;
    });
    for (const fact of linked)
      if (
        fact.kind !== 'confirmed' &&
        !literal(claim.narration).includes(literal(fact.attribution!))
      )
        throw new EditorialFault('attribution_lost');
    const evidence = [
      ...new Map(
        linked
          .flatMap((fact) => fact.evidence)
          .map((item) => [`${item.articleId}:${item.quote}`, item]),
      ).values(),
    ];
    assertNumbers(claim.narration, evidence.map((item) => item.quote).join(' '));
    return { narration: claim.narration, evidence };
  });
  assertNumbers(
    draft.title,
    draft.titleFactIds.flatMap((id) => byId.get(id)!.evidence.map((item) => item.quote)).join(' '),
  );
  const script: EpisodeScript = { title: draft.title, claims };
  const wordCount = narrationText(script).trim().split(/\s+/).length;
  if (wordCount < 170 || wordCount > 360) throw new EditorialFault('budget_exceeded');
  return { draft, script, wordCount };
}
function artifactId(context: EditorialContext, draft: EditorialDraft, script: EpisodeScript) {
  return digest({
    version: 'editorial-v1',
    topicId: context.topic.id,
    sourceDigest: context.sourceDigest,
    facts: context.facts,
    draft,
    script,
  });
}
function validateReview(value: unknown, draft: EditorialDraft, expected: string): EditorialReview {
  const parsed = reviewSchema.safeParse(value);
  if (!parsed.success) throw new EditorialFault('invalid_structure');
  const review = parsed.data;
  if (
    review.artifactId !== expected ||
    review.claims.length !== draft.claims.length ||
    new Set(review.claims.map((claim) => claim.claimId)).size !== review.claims.length ||
    review.claims.some((claim) => !draft.claims.some((item) => item.id === claim.claimId))
  )
    throw new EditorialFault('review_mismatch');
  if (
    !review.titleSupported ||
    !review.titleRelevant ||
    !review.independentSources ||
    review.issues.length ||
    review.claims.some(({ claimId: _id, ...checks }) =>
      Object.values(checks).some((passed) => !passed),
    )
  )
    throw new EditorialFault('review_rejected');
  return review;
}
export async function extractEditorialFacts(
  input: EditorialInput,
  model: EditorialModel,
  options: Options = {},
): Promise<EditorialContext> {
  const snapshot = structuredClone(input);
  assertSources(snapshot.articles, (options.clock || (() => new Date()))());
  options.onCheck?.('sources');
  const result = await model.extract(structuredClone(snapshot));
  const facts = parseFacts(result.value, snapshot.articles);
  assertSources(snapshot.articles, (options.clock || (() => new Date()))());
  options.onCheck?.('facts');
  return {
    ...snapshot,
    facts,
    sourceDigest: digest({
      topic: snapshot.topic,
      articles: snapshot.articles,
      referenceAt: snapshot.referenceAt,
    }),
    extractionUsage: result.usage,
  };
}
export async function prepareEditorial(
  contextInput: EditorialContext,
  model: EditorialModel,
  targetWords = 260,
  options: Options = {},
): Promise<ApprovedEditorial> {
  const clock = options.clock || (() => new Date());
  const context = structuredClone(contextInput);
  if (
    context.sourceDigest !==
    digest({ topic: context.topic, articles: context.articles, referenceAt: context.referenceAt })
  )
    throw new EditorialFault('changed_artifact');
  assertSources(context.articles, clock());
  parseFacts(context.facts, context.articles);
  if (!Number.isInteger(targetWords) || targetWords < 170 || targetWords > 320)
    throw new EditorialFault('budget_exceeded');
  const input: DraftInput = {
    topic: context.topic,
    articles: context.articles,
    referenceAt: context.referenceAt,
    facts: context.facts,
    targetWords,
  };
  const drafted = await model.draft(structuredClone(input));
  const { draft, script, wordCount } = compileDraft(drafted.value, context.facts);
  const used = new Set(
    script.claims.flatMap((claim) => claim.evidence.map((item) => item.articleId)),
  );
  try {
    assertSufficientSources(context.articles.filter((article) => used.has(article.id)));
  } catch {
    throw new EditorialFault('insufficient_sources');
  }
  validateEvidence(script, context.articles);
  options.onCheck?.('draft');
  assertSources(context.articles, clock());
  const id = artifactId(context, draft, script);
  const reviewed = await model.review(structuredClone({ ...input, draft, script, artifactId: id }));
  const review = validateReview(reviewed.value, draft, id);
  options.onCheck?.('review');
  const approved: ApprovedEditorial = {
    context,
    targetWords,
    draft,
    script,
    review,
    artifactId: id,
    checkedAt: clock().toISOString(),
    wordCount,
    usage: { extraction: context.extractionUsage, draft: drafted.usage, review: reviewed.usage },
  };
  assertApprovedEditorial(approved, clock());
  options.onCheck?.('voice_gate');
  return approved;
}
export function assertApprovedEditorial(value: ApprovedEditorial, now: Date): void {
  assertSources(value.context.articles, now);
  const original = {
    topic: value.context.topic,
    articles: value.context.articles,
    referenceAt: value.context.referenceAt,
  };
  if (
    digest(original) !== value.context.sourceDigest ||
    artifactId(value.context, value.draft, value.script) !== value.artifactId
  )
    throw new EditorialFault('changed_artifact');
  parseFacts(value.context.facts, value.context.articles);
  const compiled = compileDraft(value.draft, value.context.facts);
  if (digest(compiled.script) !== digest(value.script))
    throw new EditorialFault('changed_artifact');
  const used = new Set(
    value.script.claims.flatMap((claim) => claim.evidence.map((item) => item.articleId)),
  );
  try {
    assertSufficientSources(value.context.articles.filter((article) => used.has(article.id)));
  } catch {
    throw new EditorialFault('insufficient_sources');
  }
  validateReview(value.review, value.draft, value.artifactId);
}
