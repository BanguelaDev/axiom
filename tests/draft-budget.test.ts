import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitDraftBudget } from '../packages/pipeline/draft-budget.ts';
import { editorialFixture } from '../packages/backend/editorial-demo.ts';

test('orçamento seleciona parágrafos completos sem perder fatos do título e diversidade', () => {
  const fixture = editorialFixture('ai', new Date('2026-11-09T02:00:00Z'));
  const draft = structuredClone(fixture.draft);
  draft.claims = draft.claims.map((claim) => ({
    ...claim,
    narration: 'Palavra verificável. '.repeat(62),
  }));
  const input = { ...fixture.input, facts: fixture.facts, targetWords: 250 };
  const result = fitDraftBudget(draft, input);
  assert.equal(result.claims.length, 2);
  assert.deepEqual(result.claims, draft.claims.slice(0, 2));
  assert.deepEqual(result.titleFactIds, draft.titleFactIds);
  assert.equal(draft.claims.length, 3);
  const short = structuredClone(fixture.draft);
  assert.deepEqual(fitDraftBudget(short, { ...input, targetWords: 320 }), short);
});

test('orçamento não descarta origens obrigatórias nem altera material insuficiente', () => {
  const fixture = editorialFixture('ai', new Date('2026-11-09T02:00:00Z'));
  const draft = structuredClone(fixture.draft);
  draft.claims = draft.claims.map((claim) => ({
    ...claim,
    narration: 'Palavra verificável. '.repeat(62),
  }));
  draft.titleFactIds = fixture.facts.facts.map((fact) => fact.id);
  const input = { ...fixture.input, facts: fixture.facts, targetWords: 250 };
  assert.deepEqual(fitDraftBudget(draft, input), draft);
  const insufficient = { ...draft, sufficient: false };
  assert.deepEqual(fitDraftBudget(insufficient, input), insufficient);
});
