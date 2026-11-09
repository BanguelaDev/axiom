import type { SupabaseClient } from '@supabase/supabase-js';
import { getTopic } from '../core/src/topics.ts';
import { publishEpisode } from '../pipeline/publish-episode.ts';
import type { Processor } from './local-repository.ts';
import { GeminiQuotaFault } from '../pipeline/gemini.ts';
import { InsufficientNewsFault } from '../pipeline/rss.ts';
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function runGenerationWorker(
  client: SupabaseClient,
  jobId: string,
  processor: Processor,
) {
  if (!idPattern.test(jobId)) throw new Error('Identificador inválido.');
  const found = await client
    .from('generation_jobs')
    .select('id,topic_id,stage,episode_id')
    .eq('id', jobId)
    .maybeSingle();
  if (found.error || !found.data) throw new Error('Trabalho indisponível.');
  if (found.data.stage === 'ready') return { status: 'ready', episodeId: found.data.episode_id };
  const topic = getTopic(found.data.topic_id);
  if (!topic) throw new Error('Tema inválido.');
  const claimed = await client
    .from('generation_jobs')
    .update({ stage: 'processing', updated_at: new Date().toISOString() })
    .eq('id', jobId)
    .eq('stage', 'queued')
    .select('id')
    .maybeSingle();
  if (claimed.error) throw new Error('Não foi possível reservar o processamento.');
  if (!claimed.data) return { status: 'already_claimed' };
  const heartbeat = async () => {
    const updated = await client
      .from('generation_jobs')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', jobId)
      .eq('stage', 'processing');
    if (updated.error) throw new Error('Não foi possível atualizar o trabalho.');
  };
  const timer = setInterval(() => {
    void heartbeat().catch(() => {});
  }, 30_000);
  try {
    const rendered = await processor(topic.id, jobId, heartbeat);
    await heartbeat();
    const episodeId = await publishEpisode(client, jobId, rendered);
    return { status: 'ready', episodeId };
  } catch (error) {
    // Uma confirmação incerta pode já ter publicado; a condição preserva o estado ready.
    const updated = await client
      .from('generation_jobs')
      .update({
        stage: 'failed',
        safe_error:
          error instanceof GeminiQuotaFault
            ? 'free_quota'
            : error instanceof InsufficientNewsFault
              ? 'insufficient_news'
              : 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .eq('stage', 'processing');
    if (updated.error)
      throw new Error(
        'Processamento interrompido; o estado será recuperado pelo prazo do trabalho.',
      );
    return { status: 'failed' };
  } finally {
    clearInterval(timer);
  }
}
