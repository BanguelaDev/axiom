import { createServer, type Server } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { createApi } from './handler.ts';
import { createSelectionDemo } from './selection-demo.ts';
import { createEditorialDemo } from './editorial-demo.ts';
import { createAudioDemo } from './audio-demo.ts';
import { resolve } from 'node:path';
import { LocalRepository, type Processor } from './local-repository.ts';
import { generatePodcast } from '../pipeline/generate-podcast.ts';

/** Runner descartável: não substitui Supabase Auth, banco, Storage nem Trigger.dev. */
export function startLocalApi(
  port = 8787,
  options: { generation?: boolean; processor?: Processor; host?: string; publicUrl?: string } = {},
): Promise<Server> {
  const sessions = new Map<string, { id: string; expires: number }>();
  const allowedOrigins = [
    'http://localhost:8081',
    'http://127.0.0.1:8081',
    ...(options.publicUrl ? [options.publicUrl.replace(/:8787\/?$/, ':8081')] : []),
  ];
  const audioDemo = createAudioDemo(resolve('work', 'audio-demo'));
  let actualPort = port;
  const repository = new LocalRepository(
    options.processor ||
      ((topic, id, onPhase) =>
        generatePodcast(topic, resolve('work', 'local-episodes', id), onPhase)),
    (bytes, expiresIn) => {
      const media = audioDemo.issueMedia(bytes, expiresIn);
      return {
        url: `${options.publicUrl || `http://127.0.0.1:${actualPort}`}${media.path}`,
        expiresIn: media.expiresIn,
      };
    },
  );
  const api = createApi({
    environment: 'development',
    generationAvailable: !!options.generation,
    allowedOrigins,
    developmentAudio: (scenario) => audioDemo.prepare(scenario),
    developmentEditorial: (topicId, scenario) => createEditorialDemo(topicId, scenario, new Date()),
    developmentSelection: (topicId, insufficient) =>
      createSelectionDemo(topicId, new Date(), insufficient),
    async authenticate(token) {
      const session = sessions.get(token);
      return session && session.expires > Date.now() ? session.id : null;
    },
    repository,
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
          for (const [token, session] of sessions)
            if (session.expires <= Date.now()) sessions.delete(token);
          if (sessions.size >= 64)
            response = new Response(JSON.stringify({ error: { code: 'rate_limited' } }), {
              status: 429,
              headers: sessionHeaders,
            });
          else {
            const token = randomBytes(32).toString('hex');
            sessions.set(token, { id: randomUUID(), expires: Date.now() + 3600_000 });
            response = new Response(JSON.stringify({ accessToken: token, expiresIn: 3600 }), {
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
  server.requestTimeout = 10_000;
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, options.host || '127.0.0.1', () => {
      const address = server.address();
      if (address && typeof address !== 'string') actualPort = address.port;
      resolve(server);
    });
  });
}
