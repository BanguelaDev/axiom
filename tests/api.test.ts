import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApi, type BackendOptions } from '../packages/backend/handler.ts';
import { startLocalApi } from '../packages/backend/local-server.ts';
import { inspectApi, requestApi } from '../packages/core/src/api-client.ts';
import { ApiFault } from '../packages/core/src/api.ts';

const jobId = 'a5693839-40e0-4495-9ffa-c8ae6f34d250';
function setup(overrides: Partial<BackendOptions> = {}) {
  let enqueued = 0;
  const job = {
    id: jobId,
    topicId: 'ai' as const,
    stage: 'queued' as const,
    episodeId: null,
    message: null,
  };
  const options: BackendOptions = {
    environment: 'staging',
    generationAvailable: false,
    allowedOrigins: ['http://localhost:8081'],
    async authenticate(token) {
      return token === 'valid' ? 'user-one' : token === 'other' ? 'user-two' : null;
    },
    repository: {
      async request() {
        return { kind: 'job', job };
      },
      async job(user, id) {
        return user === 'user-one' && id === jobId ? job : null;
      },
      async episode() {
        return null;
      },
      async audio() {
        return null;
      },
    },
    async enqueue() {
      enqueued++;
    },
    ...overrides,
  };
  const api = createApi(options);
  const call = (path: string, init: RequestInit = {}) =>
    api(
      new Request(`http://localhost/functions/v1/axiom${path}`, {
        ...init,
        headers: { Authorization: 'Bearer valid', ...init.headers },
      }),
    );
  return { call, enqueued: () => enqueued };
}

test('API exige sessão válida e devolve somente o catálogo público', async () => {
  const { call } = setup();
  assert.equal((await call('/topics', { headers: { Authorization: '' } })).status, 401);
  assert.equal(
    (await call('/topics', { headers: { Authorization: 'Bearer invented' } })).status,
    401,
  );
  const response = await call('/topics');
  const body = await response.json();
  assert.equal(body.topics.length, 6);
  assert.deepEqual(Object.keys(body.topics[0]).sort(), ['description', 'id', 'name']);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('API não revela pedidos de outra sessão nem conteúdo inexistente', async () => {
  const { call } = setup();
  assert.equal((await call(`/generations/${jobId}`)).status, 200);
  assert.equal(
    (await call(`/generations/${jobId}`, { headers: { Authorization: 'Bearer other' } })).status,
    404,
  );
  assert.equal((await call(`/episodes/${jobId}/audio`)).status, 404);
  assert.equal((await call('/generations/not-a-uuid')).status, 400);
});

test('geração desativada não cria trabalho nem chama a fila', async () => {
  const { call, enqueued } = setup({
    repository: {
      async request() {
        assert.fail('Não deve criar trabalho.');
      },
      async job() {
        return null;
      },
      async episode() {
        return null;
      },
      async audio() {
        return null;
      },
    },
  });
  const result = await call('/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topicId: 'ai' }),
  });
  assert.equal(result.status, 503);
  assert.equal((await result.json()).error.code, 'generation_unavailable');
  assert.equal(enqueued(), 0);
});

test('contrato de fila responde rapidamente e trata tema, corpo e origem inválidos', async () => {
  const { call, enqueued } = setup({ generationAvailable: true });
  const send = (body: string) =>
    call('/generations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  assert.equal((await send(JSON.stringify({ topicId: 'ai' }))).status, 202);
  assert.equal(enqueued(), 1);
  for (const body of ['{', '{"topicId":"unknown"}', 'null', 'x'.repeat(1025)])
    assert.equal((await send(body)).status, 400);
  assert.equal(
    (await call('/topics', { headers: { Origin: 'https://untrusted.example' } })).status,
    403,
  );
  const preflight = await call('/topics', {
    method: 'OPTIONS',
    headers: { Origin: 'http://localhost:8081' },
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), 'http://localhost:8081');
});

test('falhas privadas são sanitizadas e quotas orientam nova tentativa', async () => {
  const { call } = setup({
    async authenticate() {
      throw new Error('secret-key=should-never-leak');
    },
  });
  const failure = await call('/topics');
  assert.equal(failure.status, 503);
  assert.doesNotMatch(await failure.text(), /secret-key|should-never-leak/);
  const limited = setup({
    async authenticate() {
      throw new ApiFault('rate_limited', 429);
    },
  });
  assert.equal((await limited.call('/topics')).headers.get('retry-after'), '60');
});

test('app conversa por HTTP com sessão descartável e catálogo da API local', async () => {
  const server = await startLocalApi(0);
  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const url = `http://127.0.0.1:${address.port}`;
    const session = await fetch(`${url}/dev/session`, { method: 'POST' }).then((response) =>
      response.json(),
    );
    const result = await inspectApi({
      url,
      async getToken() {
        return session.accessToken;
      },
    });
    assert.equal(result.health.environment, 'development');
    assert.equal(result.health.generationAvailable, false);
    assert.equal(result.topics.length, 6);
    const selection = (await requestApi(
      {
        url,
        async getToken() {
          return session.accessToken;
        },
      },
      '/dev/selection/ai',
    )) as { simulated: boolean; report: { status: string; selected: number } };
    assert.equal(selection.simulated, true);
    assert.equal(selection.report.status, 'ready');
    assert.equal(selection.report.selected, 3);
    const editorial = (await requestApi(
      {
        url,
        async getToken() {
          return session.accessToken;
        },
      },
      '/dev/editorial/ai?scenario=contradiction',
    )) as { status: string; reason: string };
    assert.equal(editorial.status, 'blocked');
    assert.equal(editorial.reason, 'review_rejected');
    assert.doesNotMatch(
      JSON.stringify(editorial),
      /"(?:script|narration|quote|draft|statement|artifactId)":/,
    );
    await assert.rejects(
      requestApi(
        {
          url,
          async getToken() {
            return 'forged';
          },
        },
        '/topics',
      ),
      (error: unknown) => error instanceof ApiFault && error.code === 'unauthorized',
    );
    const blocked = await fetch(`${url}/dev/session`, {
      method: 'POST',
      headers: { Origin: 'https://untrusted.example' },
    });
    assert.equal(blocked.status, 403);
  } finally {
    server.close();
    await once(server, 'close');
  }
});

test('apresentações não existem na API de staging e exigem sessão no desenvolvimento', async () => {
  const { call } = setup();
  assert.equal((await call('/dev/selection/ai')).status, 404);
  assert.equal((await call('/dev/editorial/ai')).status, 404);
  assert.equal((await call('/dev/audio')).status, 404);
  const local = setup({ environment: 'development' });
  assert.equal(
    (await local.call('/dev/selection/ai', { headers: { Authorization: '' } })).status,
    401,
  );
  assert.equal((await local.call('/dev/audio', { headers: { Authorization: '' } })).status, 401);
});

test('cliente rejeita API incompatível e não repassa mensagens arbitrárias do servidor', async () => {
  await assert.rejects(
    inspectApi({
      url: 'https://api.example',
      async getToken() {
        return 'token';
      },
      fetch: async () => Response.json({ version: 999 }),
    }),
    /incompatível/,
  );
  await assert.rejects(
    requestApi(
      {
        url: 'https://api.example',
        async getToken() {
          return 'token';
        },
        fetch: async () =>
          Response.json(
            { error: { code: '__proto__', message: 'private trace' } },
            { status: 500 },
          ),
      },
      '/topics',
    ),
    (error: unknown) => error instanceof ApiFault && !error.message.includes('private trace'),
  );
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    requestApi(
      {
        url: 'https://api.example',
        async getToken() {
          return 'token';
        },
        fetch: async () => {
          assert.fail('Não deve consultar após cancelar.');
        },
      },
      '/topics',
      controller.signal,
    ),
  );
});

test('cliente renova sessão rejeitada uma vez e preserva o pedido sem repetir falhas do servidor', async () => {
  for (const status of [401, 503]) {
    let calls = 0,
      renewals = 0;
    const connection = {
      url: 'https://api.example',
      async getToken() {
        return renewals ? 'new-session' : 'old-session';
      },
      async renewSession() {
        renewals++;
      },
      fetch: (async (_url, init) => {
        calls++;
        assert.equal(init?.method, 'POST');
        assert.equal(init?.body, JSON.stringify({ topicId: 'ai' }));
        assert.equal(
          new Headers(init?.headers).get('authorization'),
          `Bearer ${renewals ? 'new-session' : 'old-session'}`,
        );
        return calls === 1
          ? Response.json({ error: { code: 'unauthorized' } }, { status })
          : Response.json({ accepted: true });
      }) as typeof fetch,
    };
    const request = requestApi(connection, '/generations', undefined, {
      method: 'POST',
      body: { topicId: 'ai' },
    });
    if (status === 401) {
      assert.deepEqual(await request, { accepted: true });
      assert.equal(calls, 2);
      assert.equal(renewals, 1);
    } else {
      await assert.rejects(request);
      assert.equal(calls, 1);
      assert.equal(renewals, 0);
    }
  }
  let renewals = 0,
    calls = 0;
  await assert.rejects(
    requestApi(
      {
        url: 'https://api.example',
        async getToken() {
          return 'expired';
        },
        async renewSession() {
          renewals++;
        },
        fetch: async () => {
          calls++;
          return Response.json({ error: { code: 'unauthorized' } }, { status: 401 });
        },
      },
      '/topics',
    ),
  );
  assert.equal(calls, 2);
  assert.equal(renewals, 1);
});
