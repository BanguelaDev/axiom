import { createServer, type Server } from 'node:http';
import { createApi } from './handler.ts';
import { createSelectionDemo } from './selection-demo.ts';
import { createEditorialDemo } from './editorial-demo.ts';
import { createAudioDemo } from './audio-demo.ts';
import { resolve } from 'node:path';
import { LocalRepository, type Processor } from './local-repository.ts';
import { generatePodcast } from '../pipeline/generate-podcast.ts';
import { GeminiAccessFault, GeminiQuotaFault } from '../pipeline/gemini.ts';
import { EditorialFault } from '../pipeline/editorial.ts';
import { AudioFault } from '../pipeline/audio.ts';
import { InsufficientNewsFault } from '../pipeline/rss.ts';
import { LocalStore } from './local-store.ts';

/** Servidor local com SQLite; a infraestrutura remota continua opcional. */
export function startLocalApi(
  port = 8787,
  options: {
    generation?: boolean;
    processor?: Processor;
    host?: string;
    publicUrl?: string;
    statePath?: string;
  } = {},
): Promise<Server> {
  const store = new LocalStore(options.statePath);
  store.prune();
  const allowedOrigins = [
    'http://localhost:8081',
    'http://127.0.0.1:8081',
    ...(options.publicUrl ? [options.publicUrl.replace(/:8787\/?$/, ':8081')] : []),
  ];
  const audioDemo = createAudioDemo(resolve('work', 'audio-demo'));
  let actualPort = port;
  let repository: LocalRepository;
  try {
    repository = new LocalRepository(
      options.processor ||
        (async (topic, id, onPhase) => {
          const started = Date.now();
          let phaseStarted = started,
            previousPhase = 'starting';
          store.event('generation-start', { id, topicId: topic });
          try {
            const rendered = await generatePodcast(
              topic,
              resolve('work', 'local-episodes', id),
              async (phase) => {
                store.event('phase', {
                  id,
                  phase: previousPhase,
                  milliseconds: Date.now() - phaseStarted,
                });
                previousPhase = phase;
                phaseStarted = Date.now();
                await onPhase(phase);
                console.log(`[AXIOM] ${id.slice(0, 8)}: ${phase}`);
              },
              {
                rememberPublication: (url, published) => store.firstPublication(url, published),
                onUsage: async (model, usage) => {
                  store.event('provider-usage', { id, model, ...usage });
                },
                onNarration: async (characters) => {
                  store.event('narration', { id, characters });
                },
              },
            );
            store.event('phase', {
              id,
              phase: previousPhase,
              milliseconds: Date.now() - phaseStarted,
            });
            store.event('generation-ready', {
              id,
              topicId: topic,
              milliseconds: Date.now() - started,
              duration: rendered.audio.metrics.duration,
              attempts: rendered.attempts.length,
            });
            return rendered;
          } catch (error) {
            const code =
              error instanceof GeminiAccessFault
                ? `gemini_http_${error.status}`
                : error instanceof GeminiQuotaFault
                  ? 'free_quota'
                  : error instanceof InsufficientNewsFault
                    ? 'insufficient_news'
                    : error instanceof EditorialFault || error instanceof AudioFault
                      ? error.code
                      : 'generation_failed';
            console.log(`[AXIOM] ${id.slice(0, 8)}: ${code}`);
            store.event('generation-failed', {
              id,
              topicId: topic,
              code,
              milliseconds: Date.now() - started,
            });
            throw error;
          }
        }),
      (bytes, expiresIn, id) => {
        const media = audioDemo.issueMedia(bytes, expiresIn, () => !store.isWithdrawn(id));
        store.event('audio-access', { id, bytes: bytes.length });
        return {
          url: `${options.publicUrl || `http://127.0.0.1:${actualPort}`}${media.path}`,
          expiresIn: media.expiresIn,
        };
      },
      () => Date.now(),
      store,
    );
  } catch (error) {
    store.close();
    throw error;
  }
  const api = createApi({
    environment: 'development',
    generationAvailable: !!options.generation,
    allowedOrigins,
    developmentAudio: (scenario) => audioDemo.prepare(scenario),
    developmentEditorial: (topicId, scenario) => createEditorialDemo(topicId, scenario, new Date()),
    developmentSelection: (topicId, insufficient) =>
      createSelectionDemo(topicId, new Date(), insufficient),
    async authenticate(token) {
      return store.session(token);
    },
    repository,
    feedback: async (userId, id, value) => store.feedback(userId, id, value),
    async enqueue(id) {
      await repository.enqueue(id);
    },
  });
  const server = createServer(async (incoming, outgoing) => {
    try {
      // Limite antes de acumular o corpo em memória.
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of incoming) {
        size += chunk.length;
        if (size > 1024) {
          outgoing.writeHead(413);
          outgoing.end();
          return;
        }
        chunks.push(Buffer.from(chunk));
      }
      const headers = new Headers();
      for (const [key, value] of Object.entries(incoming.headers))
        if (value) headers.set(key, Array.isArray(value) ? value.join(',') : value);
      const request = new Request(`http://127.0.0.1${incoming.url}`, {
        method: incoming.method,
        headers,
        body: chunks.length ? Buffer.concat(chunks) : undefined,
      });
      let response: Response;
      const origin = headers.get('origin');
      const media = new URL(request.url).pathname.match(/^\/dev\/media\/([a-f0-9]{48})$/);
      if (media && ['GET', 'HEAD'].includes(incoming.method || '')) {
        response =
          origin && !allowedOrigins.includes(origin)
            ? new Response(null, { status: 403 })
            : audioDemo.media(media[1]!, headers.get('range'), incoming.method === 'HEAD');
        if (origin && allowedOrigins.includes(origin))
          response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Vary', 'Origin');
      } else if (new URL(request.url).pathname === '/dev/session' && incoming.method === 'POST') {
        const sessionHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          Vary: 'Origin',
        };
        if (origin && !allowedOrigins.includes(origin))
          response = new Response(null, { status: 403 });
        else {
          if (origin) sessionHeaders['Access-Control-Allow-Origin'] = origin;
          const session = store.issueSession();
          if (!session)
            response = new Response(JSON.stringify({ error: { code: 'rate_limited' } }), {
              status: 429,
              headers: sessionHeaders,
            });
          else {
            response = new Response(JSON.stringify(session), {
              headers: sessionHeaders,
            });
          }
        }
      } else response = await api(request);
      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch {
      outgoing.writeHead(500, { 'Content-Type': 'application/json' });
      outgoing.end(JSON.stringify({ error: { code: 'temporarily_unavailable' } }));
    }
  });
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    try {
      repository.close();
    } catch {
      console.error('[AXIOM] Falha ao gravar o encerramento no banco local.');
    } finally {
      store.close();
    }
  };
  server.once('close', dispose);
  server.requestTimeout = 10_000;
  return new Promise((resolve, reject) => {
    server.once('error', (error) => {
      dispose();
      reject(error);
    });
    server.listen(port, options.host || '127.0.0.1', () => {
      const address = server.address();
      if (address && typeof address !== 'string') actualPort = address.port;
      resolve(server);
    });
  });
}
