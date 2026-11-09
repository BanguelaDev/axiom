import { XMLParser } from 'fast-xml-parser';
import { canonicalUrl } from '../core/src/news.ts';
import { isRecent, publicationTime } from '../core/src/news.ts';
import { matchesTopic } from './news-policy.ts';
import type { TopicId } from '../core/src/topics.ts';
import type { NewsCandidate } from './selection.ts';
import { selectNews } from './selection.ts';

type Feed = {
  url: string;
  publisher: string;
  domains: string[];
  group: string;
  topics: TopicId[];
  reviewedAt?: string;
};
const all: TopicId[] = ['ukraine', 'ai', 'mental-health', 'fraud', 'politics', 'crime'];
export class InsufficientNewsFault extends Error {
  constructor() {
    super('Notícias recentes insuficientes.');
  }
}
export const rssFeeds: Feed[] = [
  {
    url: 'https://g1.globo.com/rss/g1/',
    publisher: 'g1',
    domains: ['g1.globo.com'],
    group: 'globo',
    topics: ['crime', 'mental-health'],
    reviewedAt: '2026-11-09T15:00:00.000Z',
  },
  {
    url: 'https://www.psypost.org/exclusive/social/social-media/feed/',
    publisher: 'PsyPost',
    domains: ['psypost.org'],
    group: 'psypost',
    topics: ['mental-health'],
    reviewedAt: '2026-11-09T15:00:00.000Z',
  },
  {
    url: 'https://agenciabrasil.ebc.com.br/rss/geral/feed.xml',
    publisher: 'Agência Brasil',
    domains: ['agenciabrasil.ebc.com.br'],
    group: 'ebc',
    topics: ['crime', 'mental-health'],
  },
  {
    url: 'https://g1.globo.com/rss/g1/mundo/',
    publisher: 'g1',
    domains: ['g1.globo.com'],
    group: 'globo',
    topics: ['ukraine'],
  },
  {
    url: 'https://g1.globo.com/rss/g1/tecnologia/',
    publisher: 'g1',
    domains: ['g1.globo.com'],
    group: 'globo',
    topics: ['ai', 'fraud', 'mental-health'],
  },
  {
    url: 'https://feeds.arstechnica.com/arstechnica/index',
    publisher: 'Ars Technica',
    domains: ['arstechnica.com'],
    group: 'conde-nast',
    topics: ['ai', 'mental-health', 'fraud'],
  },
  {
    url: 'https://agenciabrasil.ebc.com.br/rss/internacional/feed.xml',
    publisher: 'Agência Brasil',
    domains: ['agenciabrasil.ebc.com.br'],
    group: 'ebc',
    topics: ['ukraine'],
  },
  {
    url: 'https://agenciabrasil.ebc.com.br/rss/saude/feed.xml',
    publisher: 'Agência Brasil',
    domains: ['agenciabrasil.ebc.com.br'],
    group: 'ebc',
    topics: ['mental-health'],
  },
  {
    url: 'https://agenciabrasil.ebc.com.br/rss/justica/feed.xml',
    publisher: 'Agência Brasil',
    domains: ['agenciabrasil.ebc.com.br'],
    group: 'ebc',
    topics: ['crime', 'fraud'],
  },
  {
    url: 'https://agenciabrasil.ebc.com.br/rss/politica/feed.xml',
    publisher: 'Agência Brasil',
    domains: ['agenciabrasil.ebc.com.br'],
    group: 'ebc',
    topics: ['politics'],
  },
  {
    url: 'https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml',
    publisher: 'Agência Brasil',
    domains: ['agenciabrasil.ebc.com.br'],
    group: 'ebc',
    topics: all,
  },
  {
    url: 'https://www.theguardian.com/world/ukraine/rss',
    publisher: 'The Guardian',
    domains: ['theguardian.com'],
    group: 'guardian',
    topics: ['ukraine'],
  },
  {
    url: 'https://www.theguardian.com/technology/artificialintelligenceai/rss',
    publisher: 'The Guardian',
    domains: ['theguardian.com'],
    group: 'guardian',
    topics: ['ai'],
  },
  {
    url: 'https://www.theguardian.com/technology/social-media/rss',
    publisher: 'The Guardian',
    domains: ['theguardian.com'],
    group: 'guardian',
    topics: ['mental-health', 'fraud'],
  },
  {
    url: 'https://www.theguardian.com/society/mental-health/rss',
    publisher: 'The Guardian',
    domains: ['theguardian.com'],
    group: 'guardian',
    topics: ['mental-health'],
  },
  {
    url: 'https://feeds.arstechnica.com/arstechnica/technology-lab',
    publisher: 'Ars Technica',
    domains: ['arstechnica.com'],
    group: 'conde-nast',
    topics: ['ai', 'mental-health', 'fraud'],
  },
  {
    url: 'https://www.bleepingcomputer.com/feed/',
    publisher: 'BleepingComputer',
    domains: ['bleepingcomputer.com'],
    group: 'bleepingcomputer',
    topics: ['fraud'],
  },
  {
    url: 'https://www.securityweek.com/feed/',
    publisher: 'SecurityWeek',
    domains: ['securityweek.com'],
    group: 'securityweek',
    topics: ['fraud'],
  },
  {
    url: 'https://g1.globo.com/rss/g1/politica/',
    publisher: 'g1',
    domains: ['g1.globo.com'],
    group: 'globo',
    topics: ['politics'],
  },
  {
    url: 'https://g1.globo.com/rss/g1/brasil/',
    publisher: 'g1',
    domains: ['g1.globo.com'],
    group: 'globo',
    topics: ['crime'],
  },
  {
    url: 'https://g1.globo.com/rss/g1/ciencia-e-saude/',
    publisher: 'g1',
    domains: ['g1.globo.com'],
    group: 'globo',
    topics: ['mental-health'],
  },
];
function plain(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(
      /&(?:nbsp|amp|quot|apos|lt|gt);/g,
      (entity) =>
        ({ '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>' })[
          entity
        ] || entity,
    )
    .replace(/&#(x[\da-f]+|\d+);/gi, (_, code: string) => {
      const n = code[0]?.toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code);
      return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : ' ';
    })
    .replace(/\s+/g, ' ')
    .trim();
}
export function parseRss(xml: string, feed: Feed): NewsCandidate[] {
  if (xml.length > 2 * 1024 * 1024 || /<!DOCTYPE|<!ENTITY/i.test(xml))
    throw new Error('Feed incompatível.');
  const data = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: false,
    processEntities: false,
  }).parse(xml);
  const raw = data.rss?.channel?.item;
  if (!raw) throw new Error('Feed RSS indisponível.');
  const list = Array.isArray(raw) ? raw : [raw];
  const result: NewsCandidate[] = [];
  for (const item of list.slice(0, 80)) {
    try {
      const title = plain(item.title),
        content = plain(item['content:encoded'] || item.description);
      const url = canonicalUrl(item.link),
        domain = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
      const rawDate = item.pubDate || item['dc:date'];
      if (typeof rawDate !== 'string' || !/(GMT|UTC|Z|[+-]\d{2}:?\d{2})$/i.test(rawDate)) continue;
      const time = rssDate(rawDate);
      if (!Number.isFinite(time) || !feed.domains.includes(domain) || !title || !content) continue;
      result.push({
        title: title.slice(0, 500),
        content: content.slice(0, 50_000),
        url,
        publisher: feed.publisher,
        publisherDomain: domain,
        publishedAt: new Date(time).toISOString(),
      });
    } catch {
      /* Entradas incompatíveis não fornecem evidências. */
    }
  }
  return result;
}
function rssDate(value: string): number {
  if (/^\d{4}-/.test(value)) return publicationTime(value);
  const parts =
    /^(?:[a-z]{3},\s*)?(\d{1,2})\s+([a-z]{3})\s+(\d{4})\s+(\d{2}):(\d{2}):(\d{2})\s+(GMT|UTC|Z|[+-]\d{2}:?\d{2})$/i.exec(
      value.trim(),
    );
  if (!parts) return NaN;
  const [, day, month, year, hour, minute, second, offset] = parts;
  const n =
    ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(
      month!.toLowerCase(),
    ) + 1;
  const zone = /^(GMT|UTC|Z)$/i.test(offset!)
    ? 'Z'
    : offset!.replace(/^([+-]\d{2})(\d{2})$/, '$1:$2');
  return publicationTime(
    `${year}-${String(n).padStart(2, '0')}-${day!.padStart(2, '0')}T${hour}:${minute}:${second}${zone}`,
  );
}
async function fetchFeed(feed: Feed, fetcher: typeof fetch) {
  const response = await fetcher(feed.url, {
    headers: {
      Accept: 'application/rss+xml, application/xml, text/xml',
      'User-Agent': 'AXIOM-academic-news-reader/0.7',
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error('Feed indisponível.');
  const reader = response.body?.getReader();
  if (!reader) throw new Error();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 2 * 1024 * 1024) {
        await reader.cancel();
        throw new Error();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return parseRss(Buffer.concat(chunks).toString('utf8'), feed);
}
export async function collectRss(
  topic: TopicId,
  reference: Date,
  fetcher: typeof fetch = fetch,
  remember?: (url: string, publishedAt: string) => string,
) {
  const feeds = rssFeeds.filter((feed) => feed.topics.includes(topic));
  const batches = await Promise.allSettled(feeds.map((feed) => fetchFeed(feed, fetcher)));
  const received = batches.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
  const firstPublication = new Map<string, string>();
  for (const item of received) {
    const first = firstPublication.get(item.url);
    if (!first || Date.parse(item.publishedAt) < Date.parse(first))
      firstPublication.set(item.url, item.publishedAt);
  }
  const allCandidates = received.map((item) => ({
    ...item,
    publishedAt:
      remember?.(item.url, firstPublication.get(item.url)!) ?? firstPublication.get(item.url)!,
  }));
  const priority = (item: NewsCandidate) =>
    Number(
      isRecent(item.publishedAt, reference) &&
        matchesTopic(topic, item.title, item.content) &&
        item.content.length >= 500,
    );
  const ordered = allCandidates.sort(
    (a, b) => priority(b) - priority(a) || Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );
  // O limite não pode eliminar uma origem inteira só porque outra publica mais.
  const candidates: NewsCandidate[] = [];
  const owners = new Map(
    feeds.flatMap((feed) => feed.domains.map((domain) => [domain, feed.group] as const)),
  );
  for (const rank of [1, 0]) {
    const groups = new Map<string, NewsCandidate[]>();
    for (const item of ordered) {
      if (priority(item) !== rank) continue;
      const owner = owners.get(item.publisherDomain) || item.publisherDomain;
      const queue = groups.get(owner) || [];
      queue.push(item);
      groups.set(owner, queue);
    }
    while (candidates.length < 50 && [...groups.values()].some((queue) => queue.length))
      for (const queue of groups.values()) {
        if (candidates.length >= 50) break;
        const next = queue.shift();
        if (next) candidates.push(next);
      }
  }
  const registry = feeds.map((feed) => ({
    domains: feed.domains,
    editorialGroup: feed.group,
    reviewedAt: feed.reviewedAt || '2026-11-08T00:00:00.000Z',
  }));
  const result = selectNews(candidates, topic, reference, registry);
  return {
    ...result,
    collection: {
      requests: feeds.length,
      unavailableFeeds: batches.filter((item) => item.status === 'rejected').length,
      provider: 'rss',
      content:
        'Somente o texto disponibilizado nos feeds; não pressupõe acesso ao artigo completo.',
    },
  };
}
