import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  editorialFixture,
  fixtureEditorialModel,
  approvingReview,
} from '../packages/backend/editorial-demo.ts';
import {
  extractEditorialFacts,
  EditorialFault,
  type EditorialModel,
} from '../packages/pipeline/editorial.ts';
import { prepareWithRepair } from '../packages/pipeline/editorial-repair.ts';
import { GeminiQuotaFault } from '../packages/pipeline/gemini.ts';

const now = new Date('2026-11-09T14:00:00Z');
const fixture = editorialFixture('ai', now);
const base = fixtureEditorialModel(fixture);
const options = { clock: () => now };

test('rejeição editorial orienta uma correção e a versão final exige nova revisão', async () => {
  const context = await extractEditorialFacts(fixture.input, base, options);
  let drafts = 0,
    reviews = 0,
    audits = 0;
  const model: EditorialModel = {
    ...base,
    async draft(input) {
      drafts++;
      if (drafts === 2) {
        assert.equal(input.revision?.reason, 'review_rejected');
        assert.deepEqual(input.revision?.previousReview?.issues, ['unsupported']);
        assert.equal(input.revision?.previousDraft.title, fixture.draft.title);
      }
      return base.draft(input);
    },
    async review(input) {
      const value = approvingReview(input);
      if (++reviews === 1) {
        value.claims[0]!.supported = false;
        value.issues = ['unsupported'];
      }
      return { value, usage: null };
    },
  };
  const result = await prepareWithRepair(
    context,
    model,
    260,
    async () => {
      audits++;
    },
    options,
  );
  assert.equal(result.review.claims[0]!.supported, true);
  assert.equal(drafts, 2);
  assert.equal(reviews, 2);
  assert.equal(audits, 1);
});

test('segunda rejeição continua bloqueada e cota gratuita não provoca nova chamada', async () => {
  const context = await extractEditorialFacts(fixture.input, base, options);
  let reviews = 0;
  await assert.rejects(
    prepareWithRepair(
      context,
      {
        ...base,
        async review(input) {
          reviews++;
          const value = approvingReview(input);
          value.issues = ['unsupported'];
          return { value, usage: null };
        },
      },
      260,
      async () => {},
      options,
    ),
    (error) => error instanceof EditorialFault && error.code === 'review_rejected',
  );
  assert.equal(reviews, 2);
  let calls = 0;
  await assert.rejects(
    prepareWithRepair(
      context,
      {
        ...base,
        async draft() {
          calls++;
          throw new GeminiQuotaFault();
        },
      },
      260,
      async () => {},
      options,
    ),
    GeminiQuotaFault,
  );
  assert.equal(calls, 1);
});
