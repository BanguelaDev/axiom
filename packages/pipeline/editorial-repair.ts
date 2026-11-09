import { draftSchema, reviewSchema } from './editorial-schema.ts';
import {
  EditorialFault,
  prepareEditorial,
  type DraftInput,
  type EditorialContext,
  type EditorialModel,
} from './editorial.ts';

/** Uma correção orientada pelo motivo da rejeição; nunca repete indisponibilidade ou cota. */
export async function prepareWithRepair(
  context: EditorialContext,
  model: EditorialModel,
  words: number,
  onRepair: (revision: NonNullable<DraftInput['revision']>) => Promise<void> = async () => {},
  options: Parameters<typeof prepareEditorial>[3] = {},
) {
  let draft: ReturnType<typeof draftSchema.parse> | null = null;
  let review: ReturnType<typeof reviewSchema.parse> | null = null;
  const tracking: EditorialModel = {
    ...model,
    async draft(input) {
      const result = await model.draft(input);
      const parsed = draftSchema.safeParse(result.value);
      draft = parsed.success ? parsed.data : null;
      return result;
    },
    async review(input) {
      const result = await model.review(input);
      const parsed = reviewSchema.safeParse(result.value);
      review = parsed.success ? parsed.data : null;
      return result;
    },
  };
  try {
    return await prepareEditorial(context, tracking, words, options);
  } catch (error) {
    if (
      !(error instanceof EditorialFault) ||
      !draft ||
      ![
        'review_rejected',
        'unsupported_number',
        'attribution_lost',
        'budget_exceeded',
        'unmapped_claim',
      ].includes(error.code)
    )
      throw error;
    const revision = { reason: error.code, previousDraft: draft, previousReview: review };
    await onRepair(revision);
    return prepareEditorial(
      context,
      {
        ...model,
        draft: (input) => model.draft({ ...input, revision }),
      },
      words,
      options,
    );
  }
}
