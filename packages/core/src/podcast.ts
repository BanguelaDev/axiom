import {
  ApiFault,
  generationMessages,
  type PublicEpisode,
  type PublicJob,
  type GenerationResult,
} from './api.ts';
import { requestApi, type ApiConnection } from './api-client.ts';
import { getTopic, type TopicId } from './topics.ts';

export const isId = (id: unknown): id is string =>
  typeof id === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object';
const date = (value: unknown): value is string =>
  typeof value === 'string' && Number.isFinite(Date.parse(value));
export const webUrl = (value: unknown): value is string => {
  if (typeof value !== 'string' || value.length > 4096) return false;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
};
export function parseEpisode(value: unknown): PublicEpisode {
  if (
    !record(value) ||
    !isId(value.id) ||
    typeof value.topicId !== 'string' ||
    !getTopic(value.topicId) ||
    typeof value.title !== 'string' ||
    !value.title.trim() ||
    value.title.length > 250 ||
    !date(value.generatedAt) ||
    !date(value.expiresAt) ||
    Date.parse(value.expiresAt) <= Date.parse(value.generatedAt) ||
    typeof value.durationSeconds !== 'number' ||
    !Number.isFinite(value.durationSeconds) ||
    Math.abs(value.durationSeconds - 120) > 1 ||
    !Array.isArray(value.sources) ||
    value.sources.length < 2 ||
    value.sources.length > 6
  )
    throw new Error('Episódio incompatível com esta versão do aplicativo.');
  const sources = value.sources.map((item) => {
    if (
      !record(item) ||
      typeof item.publisher !== 'string' ||
      !item.publisher.trim() ||
      item.publisher.length > 200 ||
      typeof item.title !== 'string' ||
      !item.title.trim() ||
      item.title.length > 600 ||
      !webUrl(item.url) ||
      !date(item.publishedAt)
    )
      throw new Error('Referências incompatíveis.');
    return {
      publisher: item.publisher,
      title: item.title,
      url: item.url,
      publishedAt: item.publishedAt,
    };
  });
  return {
    id: value.id,
    topicId: value.topicId as TopicId,
    title: value.title,
    generatedAt: value.generatedAt,
    expiresAt: value.expiresAt,
    durationSeconds: value.durationSeconds,
    sources,
  };
}
export function parseJob(value: unknown): PublicJob {
  if (
    !record(value) ||
    !isId(value.id) ||
    typeof value.topicId !== 'string' ||
    !getTopic(value.topicId) ||
    !['queued', 'processing', 'ready', 'failed'].includes(String(value.stage)) ||
    (value.episodeId !== null && !isId(value.episodeId))
  )
    throw new Error('Preparação incompatível com esta versão do aplicativo.');
  return {
    id: value.id,
    topicId: value.topicId as TopicId,
    stage: value.stage as PublicJob['stage'],
    episodeId: value.episodeId as string | null,
    message:
      value.stage === 'failed'
        ? Object.values(generationMessages).includes(
            value.message as (typeof generationMessages)[keyof typeof generationMessages],
          )
          ? String(value.message)
          : generationMessages.failed
        : null,
  };
}
export function parseGeneration(value: unknown): GenerationResult {
  if (!record(value)) throw new Error('Resposta incompatível.');
  if (value.kind === 'episode') return { kind: 'episode', episode: parseEpisode(value.episode) };
  if (value.kind === 'job') return { kind: 'job', job: parseJob(value.job) };
  throw new Error('Resposta incompatível.');
}
export async function getEpisode(connection: ApiConnection, id: string, signal?: AbortSignal) {
  if (!isId(id)) throw new ApiFault('invalid_request', 400);
  const result = await requestApi(connection, `/episodes/${id}`, signal);
  return parseEpisode(record(result) ? result.episode : null);
}
export async function getAudio(connection: ApiConnection, id: string, signal?: AbortSignal) {
  if (!isId(id)) throw new ApiFault('invalid_request', 400);
  const value = await requestApi(connection, `/episodes/${id}/audio`, signal);
  if (
    !record(value) ||
    !webUrl(value.url) ||
    typeof value.expiresIn !== 'number' ||
    value.expiresIn < 1 ||
    value.expiresIn > 600
  )
    throw new Error('Endereço temporário incompatível.');
  return { url: value.url, expiresIn: value.expiresIn };
}
export async function requestGeneration(
  connection: ApiConnection,
  topicId: TopicId,
  signal?: AbortSignal,
) {
  return parseGeneration(
    await requestApi(connection, '/generations', signal, { method: 'POST', body: { topicId } }),
  );
}
export async function getJob(connection: ApiConnection, id: string, signal?: AbortSignal) {
  if (!isId(id)) throw new ApiFault('invalid_request', 400);
  const result = await requestApi(connection, `/generations/${id}`, signal);
  return parseJob(record(result) ? result.job : null);
}
export interface PodcastHistory {
  id: string;
  topicId: TopicId;
  title: string;
  duration: number;
  position: number;
  playedAt: string;
  generatedAt: string;
}
export function parsePodcastHistory(raw: string | null): PodcastHistory[] {
  try {
    const data: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(data)) return [];
    const seen = new Set<string>();
    return data
      .filter((item): item is PodcastHistory => {
        if (
          !record(item) ||
          !isId(item.id) ||
          seen.has(item.id) ||
          typeof item.topicId !== 'string' ||
          !getTopic(item.topicId) ||
          typeof item.title !== 'string' ||
          item.title.length > 250 ||
          !date(item.playedAt) ||
          !date(item.generatedAt) ||
          typeof item.duration !== 'number' ||
          !Number.isFinite(item.duration) ||
          Math.abs(item.duration - 120) > 1 ||
          typeof item.position !== 'number' ||
          !Number.isFinite(item.position) ||
          item.position < 0 ||
          item.position > item.duration
        )
          return false;
        seen.add(item.id);
        return true;
      })
      .slice(0, 40)
      .map(({ id, topicId, title, duration, position, playedAt, generatedAt }) => ({
        id,
        topicId,
        title,
        duration,
        position,
        playedAt,
        generatedAt,
      }));
  } catch {
    return [];
  }
}
