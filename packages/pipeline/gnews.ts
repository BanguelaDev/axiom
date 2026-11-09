import { z } from 'zod';
import type { TopicId } from '../core/src/topics.ts';
import { NEWS_WINDOW_MS, canonicalUrl } from '../core/src/news.ts';
import { newsQueries } from './news-policy.ts';
import type { NewsCandidate } from './selection.ts';

const itemSchema = z.object({
  title: z.string().max(500),
  content: z.string().max(100_000).nullable(),
  url: z.url(),
  publishedAt: z.string().max(100),
  source: z.object({ name: z.string().max(200), url: z.url() }),
});
export class NewsProviderFault extends Error {
  constructor(
    public readonly code:
      'configuration' | 'access' | 'quota' | 'unavailable' | 'invalid_response' | 'cancelled',
  ) {
    super(
      {
        configuration: 'Configure o fornecedor de notícias no servidor.',
        access:
          'O acesso ao fornecedor de notícias não está disponível. Confira a conta e o plano.',
        quota: 'O limite do fornecedor de notícias foi atingido.',
        unavailable: 'O fornecedor de notícias está temporariamente indisponível.',
        invalid_response: 'O fornecedor retornou dados de notícias incompatíveis.',
        cancelled: 'A coleta foi cancelada.',
      }[code],
    );
  }
}
export interface NewsBatch {
  candidates: NewsCandidate[];
  invalidItems: number;
  requests: number;
}
export interface GNewsOptions {
  key: string;
  fetch?: typeof fetch;
  signal?: AbortSignal;
  sleep?: (milliseconds: number, signal?: AbortSignal) => Promise<void>;
}
function sleep(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const cancel = () => {
      clearTimeout(timer);
      reject(new NewsProviderFault('cancelled'));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', cancel);
      resolve();
    }, milliseconds);
    if (signal?.aborted) cancel();
    else signal?.addEventListener('abort', cancel, { once: true });
  });
}
export async function collectGNews(
  topicId: TopicId,
  reference: Date,
  options: GNewsOptions,
): Promise<NewsBatch> {
  if (!options.key.trim()) throw new NewsProviderFault('configuration');
  if (!Number.isFinite(reference.getTime())) throw new NewsProviderFault('configuration');
  const result: NewsBatch = { candidates: [], invalidItems: 0, requests: 0 };
  for (const lang of ['pt', 'en'] as const) {
    const url = new URL('https://gnews.io/api/v4/search');
    url.search = new URLSearchParams({
      q: newsQueries[topicId][lang],
      lang,
      max: '25',
      page: '1',
      in: 'title,description,content',
      nullable: 'image,description',
      from: new Date(reference.getTime() - NEWS_WINDOW_MS).toISOString(),
      to: reference.toISOString(),
      sortby: 'publishedAt',
    }).toString();
    let response: Response | undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      if (options.signal?.aborted) throw new NewsProviderFault('cancelled');
      const timeout = AbortSignal.timeout(30_000);
      try {
        result.requests++;
        response = await (options.fetch || fetch)(url, {
          headers: { 'X-Api-Key': options.key },
          signal: options.signal ? AbortSignal.any([timeout, options.signal]) : timeout,
        });
      } catch {
        if (options.signal?.aborted) throw new NewsProviderFault('cancelled');
        if (attempt === 1) throw new NewsProviderFault('unavailable');
      }
      if (response?.ok) break;
      if (response && [400, 401, 403].includes(response.status))
        throw new NewsProviderFault('access');
      if (response && response.status !== 429 && response.status < 500)
        throw new NewsProviderFault('invalid_response');
      if (attempt === 1)
        throw new NewsProviderFault(response?.status === 429 ? 'quota' : 'unavailable');
      // Não manter o corpo de erro, que pode repetir credenciais ou texto do fornecedor.
      await response?.body?.cancel();
      const retry = Number(response?.headers.get('retry-after'));
      if (Number.isFinite(retry) && retry > 5)
        throw new NewsProviderFault(response?.status === 429 ? 'quota' : 'unavailable');
      await (options.sleep || sleep)(
        Math.min(5000, Math.max(1000, (retry || 1) * 1000)),
        options.signal,
      );
      response = undefined;
    }
    if (!response) throw new NewsProviderFault('unavailable');
    let data: unknown;
    try {
      const length = Number(response.headers.get('content-length'));
      if (length > 6_000_000) {
        await response.body?.cancel();
        throw new Error('oversized');
      }
      const reader = response.body?.getReader();
      let size = 0;
      const chunks: Uint8Array[] = [];
      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.length;
            if (size > 6_000_000) {
              await reader.cancel();
              throw new Error('oversized');
            }
            chunks.push(value);
          }
        } finally {
          reader.releaseLock();
        }
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      data = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      throw new NewsProviderFault(options.signal?.aborted ? 'cancelled' : 'invalid_response');
    }
    const parsed = z.object({ articles: z.array(z.unknown()).max(25) }).safeParse(data);
    if (!parsed.success) throw new NewsProviderFault('invalid_response');
    for (const raw of parsed.data.articles) {
      const item = itemSchema.safeParse(raw);
      if (!item.success) {
        result.invalidItems++;
        continue;
      }
      let source: URL;
      try {
        source = new URL(canonicalUrl(item.data.source.url));
      } catch {
        result.invalidItems++;
        continue;
      }
      result.candidates.push({
        title: item.data.title,
        content: item.data.content || '',
        url: item.data.url,
        publishedAt: item.data.publishedAt,
        publisher: item.data.source.name,
        publisherDomain: source.hostname.toLowerCase().replace(/^www\./, ''),
      });
    }
  }
  return result;
}
