import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AudioFault } from './audio.ts';
import { verifyRenderedAudio, type RenderedEpisode } from './render-episode.ts';
import { episodeExpiresAt } from '../core/src/news.ts';
import { EditorialFault } from './editorial.ts';

async function publish(
  client: SupabaseClient,
  jobId: string,
  rendered: RenderedEpisode,
  clock = () => new Date(),
): Promise<string> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(jobId))
    throw new AudioFault('publication_failed');
  const bytes = await verifyRenderedAudio(rendered, clock());
  const path = `${jobId}/${rendered.audio.sha256}.mp3`;
  const bucket = client.storage.from('episodes');
  const upload = await bucket.upload(path, bytes, {
    contentType: 'audio/mpeg',
    upsert: false,
    cacheControl: '300',
  });
  if (upload.error) {
    if (
      !('statusCode' in upload.error) ||
      !['409', '400'].includes(String(upload.error.statusCode))
    )
      throw new AudioFault('publication_failed');
    const existing = await bucket.download(path);
    if (
      existing.error ||
      createHash('sha256')
        .update(new Uint8Array(await existing.data.arrayBuffer()))
        .digest('hex') !== rendered.audio.sha256
    )
      throw new AudioFault('artifact_changed');
  }
  await verifyRenderedAudio(rendered, clock());
  const used = new Set(
    rendered.approved.script.claims.flatMap((claim) =>
      claim.evidence.map((item) => item.articleId),
    ),
  );
  const articles = rendered.approved.context.articles.filter((article) => used.has(article.id));
  const generatedAt = new Date(rendered.generatedAt);
  const expiresAt = episodeExpiresAt(articles, generatedAt).toISOString();
  const completed = await client.rpc('complete_generation', {
    p_job_id: jobId,
    p_payload: {
      topicId: rendered.approved.context.topic.id,
      title: rendered.approved.script.title,
      generatedAt: rendered.generatedAt,
      expiresAt,
      duration: rendered.audio.metrics.duration,
      audioPath: path,
      sha256: rendered.audio.sha256,
      sources: articles.map(
        ({ publisher, title, url, publishedAt, editorialGroup, originGroup }) => ({
          publisher,
          title,
          url,
          publishedAt,
          editorialGroup,
          originGroup,
        }),
      ),
    },
    p_script: rendered.approved.script,
    p_quality: {
      ...rendered.audio,
      artifactId: rendered.approved.artifactId,
      editorial: rendered.approved.review,
      attempts: rendered.attempts,
      voice: rendered.voiceIdentity,
    },
  });
  // Uma falha de rede pode ocultar uma transação já confirmada. Não apagar o arquivo nesse caso.
  if (completed.error || typeof completed.data !== 'string')
    throw new AudioFault('publication_failed');
  return completed.data;
}
export async function publishEpisode(
  client: SupabaseClient,
  jobId: string,
  rendered: RenderedEpisode,
  clock = () => new Date(),
): Promise<string> {
  try {
    return await publish(client, jobId, rendered, clock);
  } catch (error) {
    if (error instanceof AudioFault || error instanceof EditorialFault) throw error;
    throw new AudioFault('publication_failed');
  }
}
