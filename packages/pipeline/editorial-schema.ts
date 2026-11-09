import { z } from 'zod';

const id = z.string().regex(/^[a-z0-9_-]{1,40}$/);
export const factsSchema = z.strictObject({
  sufficient: z.boolean(),
  facts: z
    .array(
      z.strictObject({
        id,
        statement: z.string().min(1).max(1000),
        kind: z.enum(['confirmed', 'attributed', 'uncertain']),
        attribution: z.string().max(160).nullable(),
        evidence: z
          .array(
            z.strictObject({
              articleId: z.string().min(1).max(80),
              quote: z.string().min(25).max(1600),
            }),
          )
          .min(1)
          .max(4),
      }),
    )
    .max(12),
});
export const draftSchema = z.strictObject({
  sufficient: z.boolean(),
  title: z.string().max(160),
  titleFactIds: z.array(id).max(4),
  claims: z
    .array(
      z.strictObject({
        id,
        narration: z.string().min(1).max(1600),
        factIds: z.array(id).min(1).max(4),
      }),
    )
    .max(8),
});
export const reviewIssueSchema = z.enum([
  'unsupported',
  'contradiction',
  'numbers_dates_names',
  'attribution',
  'uncertainty',
  'off_topic',
  'tone',
  'source_independence',
  'title',
]);
export const reviewSchema = z.strictObject({
  artifactId: z.string().regex(/^[a-f0-9]{64}$/),
  titleSupported: z.boolean(),
  titleRelevant: z.boolean(),
  independentSources: z.boolean(),
  claims: z
    .array(
      z.strictObject({
        claimId: id,
        supported: z.boolean(),
        numbersDatesNamesFaithful: z.boolean(),
        attributionPreserved: z.boolean(),
        uncertaintyPreserved: z.boolean(),
        relevant: z.boolean(),
        appropriateTone: z.boolean(),
        contradictionsResolved: z.boolean(),
      }),
    )
    .min(2)
    .max(8),
  issues: z.array(reviewIssueSchema).max(20),
});
export type FactBundle = z.infer<typeof factsSchema>;
export type EditorialDraft = z.infer<typeof draftSchema>;
export type EditorialReview = z.infer<typeof reviewSchema>;
export interface ModelResult {
  value: unknown;
  usage: { inputTokens: number; outputTokens: number } | null;
}
