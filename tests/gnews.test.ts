import test from 'node:test';
import assert from 'node:assert/strict';
import { collectGNews, NewsProviderFault } from '../packages/pipeline/gnews.ts';
import { collectNews } from '../packages/pipeline/collect-news.ts';
import { writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const now = new Date('2026-11-08T12:00:00Z');
const sample = {
  title: 'Artigo para teste',
  content: 'Texto artificial completo. '.repeat(30),
  url: 'https://a.example/story',
  publishedAt: '2026-11-08T10:00:00Z',
  source: { name: 'Fonte de teste', url: 'https://a.example' },
};
test('GNews limita consultas, usa idiomas próprios e mantém credencial fora da URL', async () => {
  const calls: URL[] = [];
  const batch = await collectGNews('mental-health', now, {
    key: 'test-secret',
    fetch: async (input, init) => {
      const url = new URL(String(input));
      calls.push(url);
      assert.ok(!url.toString().includes('test-secret'));
      assert.equal(new Headers(init?.headers).get('X-Api-Key'), 'test-secret');
      assert.equal(url.searchParams.get('from'), '2026-11-05T12:00:00.000Z');
      assert.equal(url.searchParams.get('max'), '25');
      return Response.json({ articles: [sample, { title: 'Item malformado' }] });
    },
  });
  assert.equal(calls.length, 2);
  assert.ok(calls[0]?.searchParams.get('q')?.includes('redes sociais'));
  assert.ok(calls[1]?.searchParams.get('q')?.includes('social media'));
  assert.equal(batch.candidates.length, 2);
  assert.equal(batch.invalidItems, 2);
});

test('cadastro vazio ou ambíguo bloqueia a coleta antes de consumir o fornecedor', async () => {
  const path = join(tmpdir(), `axiom-publishers-${randomUUID()}.json`);
  const profile = {
    domains: ['a.example'],
    editorialGroup: 'group-a',
    reviewedAt: '2026-01-01T00:00:00Z',
  };
  try {
    for (const registry of [[], [profile, { ...profile, editorialGroup: 'another-group' }]]) {
      await writeFile(path, JSON.stringify(registry));
      await assert.rejects(
        collectNews('ai', now, {
          key: 'test-secret',
          registryPath: path,
          fetch: async () => {
            assert.fail('Cadastro inválido não deve consultar o fornecedor.');
          },
        }),
      );
    }
  } finally {
    await unlink(path);
  }
});

test('resposta muito grande e retry-after longo encerram a chamada com segurança', async () => {
  await assert.rejects(
    collectGNews('ai', now, {
      key: 'test-secret',
      fetch: async () => new Response('{}', { headers: { 'content-length': '6000001' } }),
    }),
    (error: unknown) => error instanceof NewsProviderFault && error.code === 'invalid_response',
  );
  let attempts = 0;
  await assert.rejects(
    collectGNews('ai', now, {
      key: 'test-secret',
      sleep: async () => {
        assert.fail('Não deve esperar além do limite.');
      },
      fetch: async () => {
        attempts++;
        return new Response(null, { status: 429, headers: { 'retry-after': '60' } });
      },
    }),
    (error: unknown) => error instanceof NewsProviderFault && error.code === 'quota',
  );
  assert.equal(attempts, 1);
});

test('falha temporária repete somente a chamada afetada, com espera limitada', async () => {
  let attempts = 0;
  const delays: number[] = [];
  const batch = await collectGNews('ai', now, {
    key: 'test-secret',
    sleep: async (ms) => {
      delays.push(ms);
    },
    fetch: async () => {
      attempts++;
      return attempts === 1 ? new Response(null, { status: 503 }) : Response.json({ articles: [] });
    },
  });
  assert.equal(batch.requests, 3);
  assert.deepEqual(delays, [1000]);
});

test('credencial negada, quota, resposta inválida e cancelamento encerram sem vazar detalhes', async () => {
  let timeouts = 0;
  await assert.rejects(
    collectGNews('ai', now, {
      key: 'test-secret',
      sleep: async () => {},
      fetch: async () => {
        timeouts++;
        throw new DOMException('test-secret private URL', 'TimeoutError');
      },
    }),
    (error: unknown) =>
      error instanceof NewsProviderFault &&
      error.code === 'unavailable' &&
      !error.message.includes('test-secret'),
  );
  assert.equal(timeouts, 2);
  for (const [status, code] of [
    [401, 'access'],
    [403, 'access'],
    [429, 'quota'],
  ] as const) {
    let calls = 0;
    await assert.rejects(
      collectGNews('ai', now, {
        key: 'test-secret',
        sleep: async () => {},
        fetch: async () => {
          calls++;
          return Response.json({ errors: ['test-secret private trace'] }, { status });
        },
      }),
      (error: unknown) =>
        error instanceof NewsProviderFault &&
        error.code === code &&
        !error.message.includes('test-secret'),
    );
    assert.equal(calls, status === 429 ? 2 : 1);
  }
  await assert.rejects(
    collectGNews('ai', now, {
      key: 'test-secret',
      fetch: async () => Response.json({ unexpected: true }),
    }),
    (error: unknown) => error instanceof NewsProviderFault && error.code === 'invalid_response',
  );
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    collectGNews('ai', now, {
      key: 'test-secret',
      signal: controller.signal,
      fetch: async () => {
        assert.fail('Cancelado antes de buscar.');
      },
    }),
    (error: unknown) => error instanceof NewsProviderFault && error.code === 'cancelled',
  );
});
