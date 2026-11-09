import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import type { TopicId } from '../core/src/topics.ts';
import { collectGNews, type GNewsOptions } from './gnews.ts';
import { selectNews } from './selection.ts';
import { publicationTime } from '../core/src/news.ts';

const registrySchema = z
  .array(
    z.object({
      domains: z.array(z.string().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/)).min(1),
      editorialGroup: z.string().trim().min(1).max(100),
      reviewedAt: z.string().refine((value) => Number.isFinite(publicationTime(value))),
    }),
  )
  .max(500)
  .refine((items) => {
    const domains = items.flatMap((item) => item.domains);
    return new Set(domains).size === domains.length;
  });
export async function loadPublisherRegistry(path: string) {
  try {
    return registrySchema.parse(JSON.parse(await readFile(path, 'utf8')));
  } catch {
    throw new Error(
      'Cadastro de fontes ausente ou inválido. Revise NEWS_PUBLISHERS_FILE no servidor.',
    );
  }
}
export async function collectNews(
  topicId: TopicId,
  reference: Date,
  options: GNewsOptions & { registryPath: string },
) {
  const registry = await loadPublisherRegistry(options.registryPath);
  if (!registry.length)
    throw new Error(
      'Cadastre as fontes e seus grupos editoriais antes de consultar notícias reais.',
    );
  if (!registry.some((profile) => publicationTime(profile.reviewedAt) <= reference.getTime()))
    throw new Error('O cadastro de fontes não possui revisão válida para esta coleta.');
  const batch = await collectGNews(topicId, reference, options);
  const result = selectNews(batch.candidates, topicId, reference, registry);
  return { ...result, collection: { invalidItems: batch.invalidItems, requests: batch.requests } };
}
