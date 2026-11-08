import {
  apiVersion,
  ApiFault,
  apiMessages,
  type ApiErrorCode,
  type ApiHealth,
  type PublicTopic,
} from './api.ts';
import { getTopic, topics } from './topics.ts';

type Fetch = typeof fetch;
export interface ApiInspection {
  health: ApiHealth;
  topics: PublicTopic[];
}
export interface ApiConnection {
  url: string;
  headers?: Record<string, string>;
  getToken(): Promise<string>;
  fetch?: Fetch;
}

export async function requestApi(
  connection: ApiConnection,
  path: string,
  signal?: AbortSignal,
): Promise<unknown> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener('abort', abort);
  const timeout = setTimeout(abort, 8000);
  try {
    const token = await new Promise<string>((resolve, reject) => {
      const cancelled = () => reject(new Error('cancelled'));
      if (controller.signal.aborted) {
        cancelled();
        return;
      }
      controller.signal.addEventListener('abort', cancelled, { once: true });
      connection
        .getToken()
        .then(resolve, reject)
        .finally(() => controller.signal.removeEventListener('abort', cancelled));
    });
    if (controller.signal.aborted) throw new Error('cancelled');
    const response = await (connection.fetch || fetch)(
      `${connection.url.replace(/\/$/, '')}${path}`,
      {
        headers: { ...connection.headers, Authorization: `Bearer ${token}` },
        signal: controller.signal,
      },
    );
    if (!response.ok) {
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        /* Resposta de proxy ou indisponibilidade. */
      }
      const code =
        body &&
        typeof body === 'object' &&
        'error' in body &&
        body.error &&
        typeof body.error === 'object' &&
        'code' in body.error
          ? body.error.code
          : null;
      throw new ApiFault(
        typeof code === 'string' && Object.hasOwn(apiMessages, code)
          ? (code as ApiErrorCode)
          : 'temporarily_unavailable',
        response.status,
      );
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}

export async function inspectApi(
  connection: ApiConnection,
  signal?: AbortSignal,
): Promise<ApiInspection> {
  const health = (await requestApi(connection, '/health', signal)) as Partial<ApiHealth> | null;
  if (
    !health ||
    health.version !== apiVersion ||
    !['development', 'staging', 'production'].includes(health.environment || '') ||
    typeof health.generationAvailable !== 'boolean'
  )
    throw new Error('Resposta incompatível da API.');
  const result = (await requestApi(connection, '/topics', signal)) as { topics?: unknown } | null;
  if (
    !result ||
    !Array.isArray(result.topics) ||
    result.topics.length !== topics.length ||
    new Set(result.topics.map((topic) => topic?.id)).size !== topics.length ||
    result.topics.some(
      (topic) =>
        !topic ||
        typeof topic.id !== 'string' ||
        !getTopic(topic.id) ||
        typeof topic.name !== 'string' ||
        typeof topic.description !== 'string',
    )
  )
    throw new Error('Catálogo incompatível da API.');
  return { health: health as ApiHealth, topics: result.topics };
}
