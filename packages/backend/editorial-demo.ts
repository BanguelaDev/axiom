import { articleId, type Article } from '../core/src/news.ts';
import { getTopic, type TopicId } from '../core/src/topics.ts';
import {
  editorialChecks,
  type EditorialCheck,
  type EditorialDemoReport,
  type EditorialScenario,
} from '../core/src/editorial-report.ts';
import { selectionFixture } from './selection-demo.ts';
import {
  extractEditorialFacts,
  prepareEditorial,
  EditorialFault,
  type EditorialModel,
  type ReviewInput,
} from '../pipeline/editorial.ts';
import type { FactBundle, EditorialDraft, EditorialReview } from '../pipeline/editorial-schema.ts';

export function editorialFixture(topicId: TopicId, now: Date) {
  const { candidates } = selectionFixture(topicId, now);
  const articles: Article[] = candidates.slice(0, 3).map((article, index) => ({
    ...article,
    id: articleId(article.url),
    publisher: `Veículo fictício ${['Alfa', 'Beta', 'Gama'][index]}`,
    editorialGroup: `demo-group-${index}`,
    originGroup: `demo-group-${index}`,
  }));
  const facts: FactBundle = {
    sufficient: true,
    facts: articles.map((article, index) => {
      const statement = article.content
        .split(/(?<=\.)\s+/)
        .slice(0, 4)
        .join(' ');
      return {
        id: `fact-${index + 1}`,
        statement,
        kind: 'attributed',
        attribution: article.publisher,
        evidence: [{ articleId: article.id, quote: statement }],
      };
    }),
  };
  const draft: EditorialDraft = {
    sufficient: true,
    title: `Exemplos fictícios sobre ${getTopic(topicId)!.name}`,
    titleFactIds: facts.facts.slice(0, 2).map((fact) => fact.id),
    claims: facts.facts.map((fact, index) => ({
      id: `claim-${index + 1}`,
      factIds: [fact.id],
      narration: `${fact.attribution} descreve: ${fact.statement}`,
    })),
  };
  return {
    input: { topic: getTopic(topicId)!, articles, referenceAt: now.toISOString() },
    facts,
    draft,
  };
}
export function approvingReview(input: ReviewInput): EditorialReview {
  return {
    artifactId: input.artifactId,
    titleSupported: true,
    titleRelevant: true,
    independentSources: true,
    issues: [],
    claims: input.draft.claims.map((claim) => ({
      claimId: claim.id,
      supported: true,
      numbersDatesNamesFaithful: true,
      attributionPreserved: true,
      uncertaintyPreserved: true,
      relevant: true,
      appropriateTone: true,
      contradictionsResolved: true,
    })),
  };
}
export function fixtureEditorialModel(
  fixture: ReturnType<typeof editorialFixture>,
  scenario: EditorialScenario = 'approved',
): EditorialModel {
  return {
    async extract() {
      const value = structuredClone(fixture.facts);
      if (scenario === 'missing_evidence')
        value.facts[0]!.evidence[0]!.quote =
          'Esta citação fictícia não aparece em nenhuma das matérias fornecidas.';
      return { value, usage: null };
    },
    async draft() {
      return { value: structuredClone(fixture.draft), usage: null };
    },
    async review(input) {
      const value = approvingReview(input);
      if (scenario === 'contradiction') {
        value.claims[0]!.contradictionsResolved = false;
        value.issues.push('contradiction');
      }
      return { value, usage: null };
    },
  };
}
export async function createEditorialDemo(
  topicId: TopicId,
  scenario: EditorialScenario,
  now: Date,
): Promise<EditorialDemoReport> {
  const fixture = editorialFixture(topicId, now);
  const completed = new Set<EditorialCheck>();
  const options = {
    clock: () => now,
    onCheck: (check: EditorialCheck) => {
      completed.add(check);
    },
  };
  const model = fixtureEditorialModel(fixture, scenario);
  let reason: EditorialDemoReport['reason'] = null;
  try {
    const context = await extractEditorialFacts(fixture.input, model, options);
    await prepareEditorial(context, model, 260, options);
  } catch (error) {
    reason = error instanceof EditorialFault ? error.code : 'model_unavailable';
  }
  let blocked = false;
  const checks = (Object.keys(editorialChecks) as EditorialCheck[]).map((key) => {
    if (completed.has(key)) return { key, status: 'passed' as const };
    if (!blocked && reason) {
      blocked = true;
      return { key, status: 'blocked' as const };
    }
    return { key, status: 'pending' as const };
  });
  return {
    simulated: true,
    topicId,
    status: reason ? 'blocked' : 'approved',
    reason,
    sourceCount: fixture.input.articles.length,
    factCount: completed.has('facts') ? fixture.facts.facts.length : 0,
    claimCount: completed.has('draft') ? fixture.draft.claims.length : 0,
    checks,
  };
}
