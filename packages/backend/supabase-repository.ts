import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ApiFault,
  generationMessages,
  type GenerationResult,
  type PublicJob,
  type PublicEpisode,
} from '../core/src/api.ts';
import type { TopicId } from '../core/src/topics.ts';
import type { BackendRepository } from './handler.ts';

const safeJobMessage = 'Não foi possível preparar o episódio. Tente novamente mais tarde.';
export class SupabaseRepository implements BackendRepository {
  constructor(private readonly client: SupabaseClient) {}

  async request(userId: string, topicId: TopicId): Promise<GenerationResult> {
    const { data, error } = await this.client.rpc('request_generation', {
      p_user_id: userId,
      p_topic_id: topicId,
    });
    if (error) {
      if (error.message.includes('rate_limited')) throw new ApiFault('rate_limited', 429);
      throw new ApiFault('temporarily_unavailable', 503);
    }
    if (data.episode_id) {
      const episode = await this.episode(data.episode_id);
      if (episode) return { kind: 'episode', episode };
    }
    const job = await this.job(userId, data.job_id);
    if (!job) throw new ApiFault('temporarily_unavailable', 503);
    return { kind: 'job', job };
  }

  async job(userId: string, id: string): Promise<PublicJob | null> {
    const access = await this.client
      .from('generation_requests')
      .select('job_id')
      .eq('job_id', id)
      .eq('user_id', userId)
      .maybeSingle();
    if (access.error) throw access.error;
    if (!access.data) return null;
    // Recuperação preguiçosa: um trabalho abandonado não fica eternamente em processamento.
    const timeout = await this.client
      .from('generation_jobs')
      .update({ stage: 'failed', safe_error: 'timeout' })
      .eq('id', id)
      .in('stage', ['queued', 'processing'])
      .lt('updated_at', new Date(Date.now() - 10 * 60_000).toISOString());
    if (timeout.error) throw timeout.error;
    const { data, error } = await this.client
      .from('generation_jobs')
      .select('id, topic_id, stage, episode_id, safe_error')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data
      ? {
          id: data.id,
          topicId: data.topic_id,
          stage: data.stage,
          episodeId: data.episode_id,
          message:
            data.stage === 'failed'
              ? generationMessages[data.safe_error as keyof typeof generationMessages] ||
                safeJobMessage
              : null,
        }
      : null;
  }

  async episode(id: string): Promise<PublicEpisode | null> {
    const { data, error } = await this.client
      .from('episodes')
      .select(
        'id, topic_id, title, generated_at, expires_at, duration_seconds, episode_sources(publisher,title,url,published_at)',
      )
      .eq('id', id)
      .eq('status', 'ready')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const sources = data.episode_sources;
    const now = Date.now();
    if (
      !Number.isFinite(Date.parse(data.expires_at)) ||
      Date.parse(data.expires_at) <= now ||
      sources.length < 2 ||
      sources.some(
        (source) =>
          !Number.isFinite(Date.parse(source.published_at)) ||
          Date.parse(source.published_at) < now - 72 * 3_600_000 ||
          Date.parse(source.published_at) > now,
      )
    )
      return null;
    return {
      id: data.id,
      topicId: data.topic_id,
      title: data.title,
      generatedAt: data.generated_at,
      expiresAt: data.expires_at,
      durationSeconds: Number(data.duration_seconds),
      sources: sources.map((source) => ({
        publisher: source.publisher,
        title: source.title,
        url: source.url,
        publishedAt: source.published_at,
      })),
    };
  }

  async audio(id: string): Promise<{ url: string; expiresIn: number } | null> {
    // Revalidar imediatamente antes de assinar; o caminho privado nunca sai da API.
    const episode = await this.episode(id);
    if (!episode) return null;
    const { data, error } = await this.client
      .from('episodes')
      .select('audio_path')
      .eq('id', id)
      .eq('status', 'ready')
      .maybeSingle();
    if (error) throw error;
    if (!data?.audio_path) return null;
    const expiresIn = Math.min(
      300,
      Math.floor((Date.parse(episode.expiresAt) - Date.now()) / 1000),
    );
    if (expiresIn < 1) return null;
    const signed = await this.client.storage
      .from('episodes')
      .createSignedUrl(data.audio_path, expiresIn);
    if (signed.error) throw signed.error;
    return { url: signed.data.signedUrl, expiresIn };
  }
}
