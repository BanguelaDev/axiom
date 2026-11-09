import test from 'node:test';
import assert from 'node:assert/strict';
import { topics } from '../packages/core/src/topics.ts';
import {
  editorialFixture,
  fixtureEditorialModel,
  createEditorialDemo,
  approvingReview,
} from '../packages/backend/editorial-demo.ts';
import {
  extractEditorialFacts,
  prepareEditorial,
  assertApprovedEditorial,
  EditorialFault,
  type EditorialModel,
} from '../packages/pipeline/editorial.ts';
import type { FactBundle, EditorialDraft } from '../packages/pipeline/editorial-schema.ts';

const now = new Date('2026-11-08T12:00:00Z');
const options = { clock: () => now };
const fault = (code: string) => (error: unknown) =>
  error instanceof EditorialFault && error.code === code;

test('o modelo pode declarar falta de material sem inventar fatos nem preencher roteiro', async () => {
  const fixture = editorialFixture('ai', now),
    base = fixtureEditorialModel(fixture);
  await assert.rejects(
    extractEditorialFacts(
      fixture.input,
      {
        ...base,
        async extract() {
          return { value: { sufficient: false, facts: [] }, usage: null };
        },
        async draft() {
          assert.fail('Não deve redigir sem fatos suficientes.');
        },
      },
      options,
    ),
    fault('insufficient_content'),
  );
  const context = await extractEditorialFacts(fixture.input, base, options);
  await assert.rejects(
    prepareEditorial(
      context,
      {
        ...base,
        async draft() {
          return {
            value: { sufficient: false, title: '', titleFactIds: [], claims: [] },
            usage: null,
          };
        },
        async review() {
          assert.fail('Não deve revisar um roteiro insuficiente.');
        },
      },
      260,
      options,
    ),
    fault('insufficient_content'),
  );
});
for (const topic of topics)
  test(`revisão fictícia em ${topic.name}: aprovação, evidência e contradição`, async () => {
    const approved = await createEditorialDemo(topic.id, 'approved', now);
    assert.equal(approved.status, 'approved');
    assert.ok(approved.checks.every((check) => check.status === 'passed'));
    assert.equal(
      (await createEditorialDemo(topic.id, 'missing_evidence', now)).reason,
      'invalid_evidence',
    );
    assert.equal(
      (await createEditorialDemo(topic.id, 'contradiction', now)).reason,
      'review_rejected',
    );
    const serialized = JSON.stringify(approved);
    for (const field of [
      'script',
      'narration',
      'statement',
      'quote',
      'draft',
      'articles',
      'artifactId',
    ])
      assert.ok(!serialized.includes(`"${field}":`));
  });

test('fatos podem ser reutilizados para ajuste de duração, mas cada rascunho exige nova revisão', async () => {
  const fixture = editorialFixture('ai', now),
    base = fixtureEditorialModel(fixture);
  const calls = { extract: 0, draft: 0, review: 0 };
  const model: EditorialModel = {
    async extract(input) {
      calls.extract++;
      return base.extract(input);
    },
    async draft(input) {
      calls.draft++;
      return base.draft(input);
    },
    async review(input) {
      calls.review++;
      return base.review(input);
    },
  };
  const context = await extractEditorialFacts(fixture.input, model, options);
  for (const words of [260, 250]) {
    const approved = await prepareEditorial(context, model, words, options);
    assert.ok(approved.wordCount >= 170 && approved.wordCount <= 360);
    assert.doesNotThrow(() => assertApprovedEditorial(approved, now));
  }
  assert.deepEqual(calls, { extract: 1, draft: 2, review: 2 });
});

test('evidência inventada, fonte desconhecida e espaços não consomem redação ou revisão', async () => {
  const fixture = editorialFixture('ai', now),
    base = fixtureEditorialModel(fixture);
  for (const change of [
    (facts: FactBundle) => {
      facts.facts[0]!.evidence[0]!.quote =
        'Citação inventada sem qualquer correspondência nas matérias.';
    },
    (facts: FactBundle) => {
      facts.facts[0]!.evidence[0]!.articleId = 'unknown';
    },
    (facts: FactBundle) => {
      facts.facts[0]!.evidence[0]!.quote = ' '.repeat(30);
    },
  ]) {
    const model: EditorialModel = {
      ...base,
      async extract() {
        const value = structuredClone(fixture.facts);
        change(value);
        return { value, usage: null };
      },
      async draft() {
        assert.fail('Não deve redigir após evidência inválida.');
      },
      async review() {
        assert.fail('Não deve revisar após evidência inválida.');
      },
    };
    await assert.rejects(
      extractEditorialFacts(fixture.input, model, options),
      fault('invalid_evidence'),
    );
  }
});

test('números novos em fatos ou narração são bloqueados antes da revisão', async () => {
  const fixture = editorialFixture('ai', now),
    base = fixtureEditorialModel(fixture);
  const badFact = structuredClone(fixture.facts);
  badFact.facts[0]!.statement += ' O total foi 999.';
  await assert.rejects(
    extractEditorialFacts(
      fixture.input,
      {
        ...base,
        async extract() {
          return { value: badFact, usage: null };
        },
      },
      options,
    ),
    fault('unsupported_number'),
  );
  const context = await extractEditorialFacts(fixture.input, base, options);
  await assert.rejects(
    prepareEditorial(
      context,
      {
        ...base,
        async draft() {
          const value = structuredClone(fixture.draft);
          value.claims[0]!.narration += ' O total foi 999.';
          return { value, usage: null };
        },
        async review() {
          assert.fail('Não deve revisar um número sem suporte.');
        },
      },
      260,
      options,
    ),
    fault('unsupported_number'),
  );
});

test('afirmação e título sem fatos, atribuição removida e falta de diversidade são bloqueados', async () => {
  const fixture = editorialFixture('ai', now),
    base = fixtureEditorialModel(fixture);
  const context = await extractEditorialFacts(fixture.input, base, options);
  const cases: [string, (draft: EditorialDraft) => void][] = [
    [
      'unmapped_claim',
      (draft) => {
        draft.claims[0]!.factIds = ['unknown'];
      },
    ],
    [
      'unmapped_claim',
      (draft) => {
        draft.titleFactIds = ['unknown'];
      },
    ],
    [
      'attribution_lost',
      (draft) => {
        draft.claims[0]!.narration = fixture.facts.facts[0]!.statement;
      },
    ],
    [
      'insufficient_sources',
      (draft) => {
        draft.titleFactIds = ['fact-1'];
        draft.claims = draft.claims.map((claim) => ({
          ...claim,
          factIds: ['fact-1'],
          narration: draft.claims[0]!.narration,
        }));
      },
    ],
  ];
  for (const [code, change] of cases)
    await assert.rejects(
      prepareEditorial(
        context,
        {
          ...base,
          async draft() {
            const value = structuredClone(fixture.draft);
            change(value);
            return { value, usage: null };
          },
        },
        260,
        options,
      ),
      fault(code),
    );
});

test('revisão omitida, repetida, de outra versão ou contraditória nunca libera o roteiro', async () => {
  const fixture = editorialFixture('ai', now),
    base = fixtureEditorialModel(fixture);
  const context = await extractEditorialFacts(fixture.input, base, options);
  for (const variant of [
    'missing',
    'duplicate',
    'other_version',
    'false_check',
    'issue',
  ] as const) {
    const model: EditorialModel = {
      ...base,
      async review(input) {
        const value = approvingReview(input);
        if (variant === 'missing') value.claims.pop();
        if (variant === 'duplicate') value.claims[1]!.claimId = value.claims[0]!.claimId;
        if (variant === 'other_version') value.artifactId = '0'.repeat(64);
        if (variant === 'false_check') value.claims[0]!.uncertaintyPreserved = false;
        if (variant === 'issue') value.issues.push('unsupported');
        return { value, usage: null };
      },
    };
    await assert.rejects(
      prepareEditorial(context, model, 260, options),
      fault(['false_check', 'issue'].includes(variant) ? 'review_rejected' : 'review_mismatch'),
    );
  }
});

test('fontes que vencem durante a revisão e artefatos alterados são barrados antes da voz', async () => {
  const fixture = editorialFixture('ai', now),
    base = fixtureEditorialModel(fixture);
  const context = await extractEditorialFacts(fixture.input, base, options);
  let clock = now;
  await assert.rejects(
    prepareEditorial(
      context,
      {
        ...base,
        async review(input) {
          clock = new Date(now.getTime() + 73 * 3600_000);
          return { value: approvingReview(input), usage: null };
        },
      },
      260,
      { clock: () => clock },
    ),
    fault('stale_sources'),
  );
  const approved = await prepareEditorial(context, base, 260, options);
  const changed = structuredClone(approved);
  changed.script.claims[0]!.narration += ' Conteúdo posterior à revisão.';
  assert.throws(() => assertApprovedEditorial(changed, now), fault('changed_artifact'));
  const changedSource = structuredClone(approved);
  changedSource.context.articles[0]!.content += ' Fonte alterada.';
  assert.throws(() => assertApprovedEditorial(changedSource, now), fault('changed_artifact'));
});

test('contexto excessivo e fontes sem revisão bloqueiam a IA antes de qualquer chamada', async () => {
  const fixture = editorialFixture('ai', now),
    base = fixtureEditorialModel(fixture);
  const model = {
    ...base,
    async extract() {
      assert.fail('Não deve chamar IA para contexto inválido.');
    },
  };
  const oversized = structuredClone(fixture.input);
  oversized.articles[0]!.content = 'x'.repeat(120_001);
  await assert.rejects(extractEditorialFacts(oversized, model, options), fault('budget_exceeded'));
  const unreviewed = structuredClone(fixture.input);
  delete unreviewed.articles[0]!.editorialGroup;
  await assert.rejects(
    extractEditorialFacts(unreviewed, model, options),
    fault('insufficient_sources'),
  );
});
