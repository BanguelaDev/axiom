import {
  apiVersion,
  ApiFault,
  type ApiEnvironment,
  type PublicJob,
  type PublicEpisode,
  type GenerationResult,
} from '../core/src/api.ts';
import { getTopic, topics, type TopicId } from '../core/src/topics.ts';
import type { DemoSelection } from '../core/src/selection-report.ts';

export interface BackendRepository {
  request(userId: string, topicId: TopicId): Promise<GenerationResult>;
  job(userId: string, id: string): Promise<PublicJob | null>;
  episode(id: string): Promise<PublicEpisode | null>;
  audio(id: string): Promise<{ url: string; expiresIn: number } | null>;
}
export interface BackendOptions {
  environment: ApiEnvironment;
  generationAvailable: boolean;
  allowedOrigins: string[];
  authenticate(token: string): Promise<string | null>;
  repository: BackendRepository;
  enqueue(jobId: string): Promise<void>;
  developmentSelection?(topicId: TopicId, insufficient: boolean): DemoSelection;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Mesmo handler para o runner local e a Edge Function. Nenhum erro privado sai na resposta. */
export function createApi(options: BackendOptions) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('origin');
    const headers = new Headers({
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      Vary: 'Origin',
      'X-Content-Type-Options': 'nosniff',
    });
    if (origin && !options.allowedOrigins.includes(origin))
      return new Response(null, { status: 403, headers });
    if (origin) headers.set('Access-Control-Allow-Origin', origin);
    headers.set(
      'Access-Control-Allow-Headers',
      'authorization, apikey, content-type, x-client-info',
    );
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    const json = (value: unknown, status = 200) =>
      new Response(JSON.stringify(value), { status, headers });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    try {
      // O prefixo /axiom é acrescentado pelo gateway do Supabase.
      const path =
        new URL(request.url).pathname
          .replace(/^\/functions\/v1\/axiom(?=\/|$)/, '')
          .replace(/^\/axiom(?=\/|$)/, '') || '/';
      if (path === '/health' && request.method === 'GET')
        return json({
          version: apiVersion,
          environment: options.environment,
          generationAvailable: options.generationAvailable,
        });

      const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
      if (!token || token.length > 8192) throw new ApiFault('unauthorized', 401);
      const userId = await options.authenticate(token);
      if (!userId) throw new ApiFault('unauthorized', 401);

      const selection = path.match(/^\/dev\/selection\/([^/]+)$/);
      if (
        selection &&
        request.method === 'GET' &&
        options.environment === 'development' &&
        options.developmentSelection
      ) {
        const topic = getTopic(selection[1]!);
        const scenario = new URL(request.url).searchParams.get('scenario') || 'ready';
        if (!topic || !['ready', 'insufficient'].includes(scenario))
          throw new ApiFault('invalid_request', 400);
        return json(options.developmentSelection(topic.id, scenario === 'insufficient'));
      }

      if (path === '/topics' && request.method === 'GET')
        return json({
          topics: topics.map(({ id, name, description }) => ({ id, name, description })),
        });
      if (path === '/generations' && request.method === 'POST') {
        if (!request.headers.get('content-type')?.startsWith('application/json'))
          throw new ApiFault('invalid_request', 400);
        if (Number(request.headers.get('content-length')) > 1024)
          throw new ApiFault('invalid_request', 400);
        const reader = request.body?.getReader();
        const chunks: Uint8Array[] = [];
        let size = 0;
        if (reader) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              size += value.length;
              if (size > 1024) {
                await reader.cancel();
                throw new ApiFault('invalid_request', 400);
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
        const text = new TextDecoder().decode(bytes);
        let body: unknown;
        try {
          body = JSON.parse(text);
        } catch {
          throw new ApiFault('invalid_request', 400);
        }
        const topicId = body && typeof body === 'object' && 'topicId' in body ? body.topicId : null;
        if (typeof topicId !== 'string' || !getTopic(topicId))
          throw new ApiFault('invalid_request', 400);
        // Não criar trabalhos pagos enquanto a etapa de viabilidade não for aprovada.
        if (!options.generationAvailable) throw new ApiFault('generation_unavailable', 503);
        const result = await options.repository.request(userId, topicId as TopicId);
        if (result.kind === 'job' && result.job.stage === 'queued')
          await options.enqueue(result.job.id);
        return json(result, result.kind === 'job' ? 202 : 200);
      }
      const jobMatch = path.match(/^\/generations\/([^/]+)$/);
      if (jobMatch && request.method === 'GET') {
        if (!uuid.test(jobMatch[1]!)) throw new ApiFault('invalid_request', 400);
        const job = await options.repository.job(userId, jobMatch[1]!);
        if (!job) throw new ApiFault('not_found', 404);
        return json({ job });
      }
      const episodeMatch = path.match(/^\/episodes\/([^/]+)(\/audio)?$/);
      if (episodeMatch && request.method === 'GET') {
        if (!uuid.test(episodeMatch[1]!)) throw new ApiFault('invalid_request', 400);
        const episode = await options.repository.episode(episodeMatch[1]!);
        if (!episode) throw new ApiFault('not_found', 404);
        if (episodeMatch[2]) {
          const audio = await options.repository.audio(episode.id);
          if (!audio) throw new ApiFault('not_found', 404);
          return json(audio);
        }
        return json({ episode });
      }
      throw new ApiFault('not_found', 404);
    } catch (error) {
      const fault =
        error instanceof ApiFault ? error : new ApiFault('temporarily_unavailable', 503);
      if (fault.code === 'rate_limited') headers.set('Retry-After', '60');
      return json({ error: { code: fault.code, message: fault.message } }, fault.status);
    }
  };
}
