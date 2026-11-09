import { createHash } from 'node:crypto';
import {
  articleId,
  canonicalUrl,
  isRecent,
  publicationTime,
  independentSourceCount,
  type Article,
} from '../core/src/news.ts';
import type { SelectionReason, SelectionReport } from '../core/src/selection-report.ts';
import type { TopicId } from '../core/src/topics.ts';
import {
  attributionGroup,
  matchesTopic,
  normalizedText,
  type PublisherProfile,
} from './news-policy.ts';

export type NewsCandidate = Omit<Article, 'id'>;
const fingerprint = (value: string) =>
  createHash('sha256').update(value).digest('hex').slice(0, 20);
function shingles(text: string): Set<string> {
  const words = normalizedText(text).split(' ');
  return new Set(words.slice(0, -4).map((_, index) => words.slice(index, index + 5).join(' ')));
}
function similarity(left: Set<string>, right: Set<string>): number {
  const common = [...left].filter((word) => right.has(word)).length;
  return common / Math.max(1, left.size + right.size - common);
}
const stopWords = new Set(
  'a o as os de do da dos das e em no na nos nas para por com um uma the of and in on for to with from sobre novo nova novos novas exemplo ficticio inteligencia artificial redes sociais saude mental brasil brazil ucrania ukraine crimes golpes fraudes'.split(
    ' ',
  ),
);
function eventWords(title: string) {
  return new Set(
    normalizedText(title)
      .split(' ')
      .filter((word) => word.length > 2 && !stopWords.has(word)),
  );
}
function sameEvent(a: Article, b: Article): boolean {
  const left = eventWords(a.title),
    right = eventWords(b.title);
  return [...left].filter((word) => right.has(word)).length >= 3 && similarity(left, right) >= 0.45;
}

export function selectNews(
  candidates: NewsCandidate[],
  topicId: TopicId,
  reference: Date,
  registry: PublisherProfile[],
) {
  if (!Number.isFinite(reference.getTime()) || candidates.length > 50)
    throw new Error('Coleção ou horário de referência inválido.');
  const report: SelectionReport = {
    version: 1,
    algorithm: 'selection-v1',
    topicId,
    referenceAt: reference.toISOString(),
    status: 'insufficient',
    received: candidates.length,
    selected: 0,
    independentSources: 0,
    events: [],
    decisions: [],
  };
  const eligible: Article[] = [];
  const firstPublication = new Map<string, number>();
  for (const candidate of candidates) {
    try {
      const url = canonicalUrl(candidate.url),
        time = publicationTime(candidate.publishedAt);
      if (Number.isFinite(time))
        firstPublication.set(url, Math.min(firstPublication.get(url) ?? Infinity, time));
    } catch {
      /* Endereços inválidos serão registrados como descarte. */
    }
  }
  const decisions = new Map<string, SelectionReport['decisions'][number]>();
  for (const [index, candidate] of candidates.entries()) {
    let id = `invalid-${index}`,
      url = '',
      reason: SelectionReason | null = null;
    try {
      url = canonicalUrl(candidate.url);
      id = articleId(url);
      if (
        !candidate.title.trim() ||
        candidate.title.length > 500 ||
        !candidate.publisher.trim() ||
        candidate.content.length > 100_000
      )
        reason = 'invalid';
    } catch {
      reason = 'invalid';
    }
    const reportedTime = publicationTime(candidate.publishedAt);
    const time = Number.isFinite(reportedTime) ? (firstPublication.get(url) ?? reportedTime) : NaN;
    const profile = reason
      ? undefined
      : registry.find(
          (item) =>
            item.domains.includes(candidate.publisherDomain.toLowerCase()) &&
            item.domains.includes(new URL(url).hostname.toLowerCase().replace(/^www\./, '')) &&
            item.editorialGroup.trim() &&
            isRecentReview(item.reviewedAt, reference),
        );
    if (!reason) {
      if (!Number.isFinite(time)) reason = 'invalid_date';
      else if (reportedTime > reference.getTime()) reason = 'future_date';
      else if (!isRecent(new Date(time).toISOString(), reference)) reason = 'outside_window';
      else if (
        candidate.content.trim().length < 500 ||
        /\[\+?\d+\s*(?:chars|characters|caracteres)\]/i.test(candidate.content)
      )
        reason = 'incomplete_content';
      else if (!matchesTopic(topicId, candidate.title, candidate.content)) reason = 'off_topic';
      else if (!profile) reason = 'unreviewed_source';
    }
    const decision: SelectionReport['decisions'][number] = {
      id,
      title: candidate.title.slice(0, 500),
      publisher: candidate.publisher.slice(0, 200),
      publishedAt: Number.isFinite(time) ? new Date(time).toISOString() : null,
      reason: reason || ('selection_limit' as SelectionReason),
      ...(url ? { url } : {}),
      ...(Number.isFinite(reportedTime) && reportedTime !== time
        ? { reportedPublishedAt: new Date(reportedTime).toISOString() }
        : {}),
    };
    report.decisions.push(decision);
    // A mesma URL pode aparecer várias vezes; a decisão acompanha a posição, não só o ID.
    if (reason) continue;
    const article: Article = {
      ...candidate,
      id,
      url,
      publishedAt: new Date(time).toISOString(),
      editorialGroup: profile!.editorialGroup,
      originGroup: attributionGroup(candidate.content) || profile!.editorialGroup,
    };
    decision.editorialGroup = article.editorialGroup;
    decision.originGroup = article.originGroup;
    eligible.push(article);
    decisions.set(`${id}:${eligible.length - 1}`, decision);
  }
  const indexed = eligible
    .map((article, index) => ({
      article,
      decision: decisions.get(`${article.id}:${index}`)!,
      shingle: shingles(article.content),
    }))
    .sort(
      (a, b) =>
        Date.parse(b.article.publishedAt) - Date.parse(a.article.publishedAt) ||
        a.article.url.localeCompare(b.article.url),
    );
  const unique: typeof indexed = [];
  for (const item of indexed) {
    const copy = unique.find(
      (other) =>
        other.article.url === item.article.url || similarity(other.shingle, item.shingle) >= 0.82,
    );
    if (copy) {
      item.decision.reason = 'duplicate';
      item.decision.relatedTo = copy.article.id;
      continue;
    }
    unique.push(item);
  }
  const groups: (typeof indexed)[] = [];
  for (const item of unique) {
    const group = groups.find((existing) => sameEvent(existing[0]!.article, item.article));
    if (group) group.push(item);
    else groups.push([item]);
  }
  const prioritized = groups.slice(0, 1);
  const firstSources = groups[0]?.map((item) => item.article) || [];
  const different = groups
    .slice(1)
    .find(
      (group) =>
        independentSourceCount([...firstSources, ...group.map((item) => item.article)]) >
        independentSourceCount(firstSources),
    );
  if (different) prioritized.push(different);
  for (const group of groups)
    if (prioritized.length < 3 && !prioritized.includes(group)) prioritized.push(group);
  const selected: Article[] = [];
  for (const group of prioritized) {
    const chosen = group.slice(0, 1);
    const independent = group.find(
      (item) => independentSourceCount([chosen[0]!.article, item.article]) > 1,
    );
    if (independent) chosen.push(independent);
    for (const item of chosen) {
      selected.push(item.article);
      item.decision.reason = 'selected';
    }
    report.events.push({
      id: fingerprint(group[0]!.article.url),
      articleIds: chosen.map((item) => item.article.id),
    });
  }
  // Um mínimo de três matérias; completar a pauta sem ultrapassar seis ou os três acontecimentos.
  if (selected.length < 3) {
    for (const group of prioritized)
      for (const item of group) {
        if (selected.length >= 3) break;
        if (!selected.includes(item.article)) {
          selected.push(item.article);
          item.decision.reason = 'selected';
          report.events
            .find((event) => event.id === fingerprint(group[0]!.article.url))!
            .articleIds.push(item.article.id);
        }
      }
  }
  report.selected = selected.length;
  report.independentSources = independentSourceCount(selected);
  report.status = selected.length >= 3 && report.independentSources >= 2 ? 'ready' : 'insufficient';
  return { articles: selected, report };
}

function isRecentReview(value: string, reference: Date): boolean {
  // Revisão cadastral deve ser explícita e não pode vir de uma data futura.
  const time = publicationTime(value);
  return Number.isFinite(time) && time <= reference.getTime();
}
