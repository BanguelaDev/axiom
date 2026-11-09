import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseEpisode,
  parsePodcastHistory,
  requestGeneration,
  getAudio,
  parseJob,
} from '../packages/core/src/podcast.ts';
import { generationMessages } from '../packages/core/src/api.ts';
const id = 'a5693839-40e0-4495-9ffa-c8ae6f34d250';
const sample = {
  id,
  topicId: 'ai',
  title: 'Edição de teste',
  generatedAt: '2026-11-09T02:00:00Z',
  expiresAt: '2026-11-09T03:00:00Z',
  durationSeconds: 120,
  sources: [
    {
      publisher: 'Fonte A',
      title: 'Matéria A',
      url: 'https://a.example/news',
      publishedAt: '2026-11-09T01:00:00Z',
    },
    {
      publisher: 'Fonte B',
      title: 'Matéria B',
      url: 'https://b.example/news',
      publishedAt: '2026-11-09T01:00:00Z',
    },
  ],
};
test('contrato do player aceita metadados válidos e remove campos privados', () => {
  assert.deepEqual(parseEpisode({ ...sample, script: 'private', token: 'private' }), sample);
  for (const invalid of [
    { ...sample, durationSeconds: NaN },
    { ...sample, durationSeconds: 12 },
    { ...sample, id: 'bad' },
    {
      ...sample,
      sources: [{ ...sample.sources[0], url: 'javascript:alert(1)' }, sample.sources[1]],
    },
  ])
    assert.throws(() => parseEpisode(invalid));
});
test('pedido de geração usa POST autenticado e retorna o episódio reutilizado', async () => {
  const result = await requestGeneration(
    {
      url: 'https://api.example',
      getToken: async () => 'session',
      fetch: async (url, init) => {
        assert.equal(String(url), 'https://api.example/generations');
        assert.equal(init?.method, 'POST');
        assert.deepEqual(JSON.parse(String(init?.body)), { topicId: 'ai' });
        assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer session');
        return Response.json({ kind: 'episode', episode: sample });
      },
    },
    'ai',
  );
  assert.equal(result.kind, 'episode');
});
test('acesso ao áudio exige URL web e validade limitada, sem persistir endereço', async () => {
  const connection = {
    url: 'https://api.example',
    getToken: async () => 'session',
    fetch: async () =>
      Response.json({ url: 'https://media.example/audio?signature=temporary', expiresIn: 300 }),
  };
  assert.equal((await getAudio(connection, id)).expiresIn, 300);
  await assert.rejects(
    getAudio(
      {
        ...connection,
        fetch: async () => Response.json({ url: 'file:///private/file.mp3', expiresIn: 300 }),
      },
      id,
    ),
  );
  await assert.rejects(
    getAudio(
      {
        ...connection,
        fetch: async () => Response.json({ url: 'https://media.example/audio', expiresIn: 99999 }),
      },
      id,
    ),
  );
});
test('histórico sobrevive a dados inválidos e nunca guarda URL assinada ou roteiro', () => {
  const item = {
    id,
    topicId: 'ai',
    title: 'Edição',
    duration: 120,
    position: 50,
    playedAt: '2026-11-09T02:00:00Z',
    generatedAt: '2026-11-08T23:00:00Z',
    url: 'https://private.example/token',
    script: 'private',
  };
  const history = parsePodcastHistory(
    JSON.stringify([
      item,
      item,
      { ...item, id: 'bad' },
      { ...item, id: 'b5693839-40e0-4495-9ffa-c8ae6f34d250', duration: null },
    ]),
  );
  assert.equal(history.length, 1);
  assert.equal(history[0]?.position, 50);
  assert.doesNotMatch(JSON.stringify(history), /private|token|script/);
  assert.deepEqual(parsePodcastHistory('{bad'), []);
});
test('mensagens de preparação aceitam a cota gratuita e descartam mensagens arbitrárias', () => {
  const job = {
    id,
    topicId: 'ai',
    stage: 'failed',
    episodeId: null,
    message: generationMessages.free_quota,
  };
  assert.equal(parseJob(job).message, generationMessages.free_quota);
  assert.equal(
    parseJob({ ...job, message: 'private stack trace' }).message,
    generationMessages.failed,
  );
});
