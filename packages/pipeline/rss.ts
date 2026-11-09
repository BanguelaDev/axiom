import { XMLParser } from 'fast-xml-parser';
import { canonicalUrl } from '../core/src/news.ts';
import { isRecent } from '../core/src/news.ts';
import { matchesTopic } from './news-policy.ts';
import type { TopicId } from '../core/src/topics.ts';
import type { NewsCandidate } from './selection.ts';
import { selectNews } from './selection.ts';

type Feed = { url: string; publisher: string; domains: string[]; group: string; topics: TopicId[] };
const all: TopicId[] = ['ukraine', 'ai', 'mental-health', 'fraud', 'politics', 'crime'];
export class InsufficientNewsFault extends Error {
  constructor() {
    super('Notícias recentes insuficientes.');
  }
}
export const rssFeeds: Feed[] = [
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
      const time = Date.parse(rawDate);
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
export async function collectRss(topic: TopicId, reference: Date, fetcher: typeof fetch = fetch) {
  const feeds = rssFeeds.filter((feed) => feed.topics.includes(topic));
  const batches = await Promise.allSettled(feeds.map((feed) => fetchFeed(feed, fetcher)));
  const allCandidates = batches.flatMap((result) =>
    result.status === 'fulfilled' ? result.value : [],
  );
  const priority = (item: NewsCandidate) =>
    Number(
      isRecent(item.publishedAt, reference) &&
        matchesTopic(topic, item.title, item.content) &&
        item.content.length >= 500,
    );
  const candidates = allCandidates
    .sort(
      (a, b) => priority(b) - priority(a) || Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
    )
    .slice(0, 50);
  const registry = feeds.map((feed) => ({
    domains: feed.domains,
    editorialGroup: feed.group,
    reviewedAt: '2026-11-08T00:00:00.000Z',
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
