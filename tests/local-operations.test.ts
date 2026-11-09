import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir, writeFile, readFile, utimes, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { LocalStore } from '../packages/backend/local-store.ts';
import { retainEpisodes } from '../packages/backend/retention.ts';
import { createAudioDemo } from '../packages/backend/audio-demo.ts';
import { parseFeedback } from '../packages/core/src/feedback.ts';
import { createApi } from '../packages/backend/handler.ts';

const id = 'a5693839-40e0-4495-9ffa-c8ae6f34d250';
async function temporary(run: (dir: string) => Promise<void>) {
  const dir = await mkdtemp(join(tmpdir(), 'axiom-operations-'));
  try {
    await run(dir);
  } finally {
    const path = resolve(dir);
    if (dirname(path) !== resolve(tmpdir()) || !basename(path).startsWith('axiom-operations-'))
      throw new Error();
    await rm(path, { recursive: true, force: true });
  }
}
test('data original e retirada persistem entre processos; avaliações são agregadas sem token ou texto livre', () =>
  temporary(async (dir) => {
    const path = join(dir, 'state.sqlite'),
      now = Date.now(),
      url = 'https://example.com/report';
    let store = new LocalStore(path);
    const first = new Date(now - 80 * 3_600_000).toISOString();
    assert.equal(store.firstPublication(url, first, now), first);
    store.withdraw(id, now);
    store.close();
    store = new LocalStore(path);
    try {
      assert.equal(store.firstPublication(url, new Date(now).toISOString(), now), first);
      assert.equal(store.isWithdrawn(id), true);
      const value = parseFeedback({ kind: 'voice-rating', clarity: 4, naturalness: 5 });
      store.feedback('private-session', id, value, now);
      store.feedback('private-session', id, value, now);
      assert.equal(store.report().feedback[0]?.count, 1);
      assert.equal(store.report().feedback[0]?.clarity, 4);
      store.event('generation-failed', { id, code: 'insufficient_news' }, now);
      store.prune(now + 31 * 86_400_000);
      assert.equal(store.report().feedback.length, 0);
      assert.equal(store.report().events.length, 1);
      store.prune(now + 91 * 86_400_000);
      assert.equal(store.report().events.length, 0);
    } finally {
      store.close();
    }
    assert.equal((await readFile(path)).includes(Buffer.from('private-session')), false);
  }));
test('link de mídia emitido antes da retirada recusa nova leitura e busca por intervalo', () => {
  const store = new LocalStore(),
    media = createAudioDemo('unused');
  try {
    const ticket = media
      .issueMedia(new Uint8Array([1, 2, 3]), 300, () => !store.isWithdrawn(id))
      .path.split('/')
      .pop()!;
    assert.equal(media.media(ticket, null).status, 200);
    store.withdraw(id);
    assert.equal(media.media(ticket, 'bytes=1-2').status, 404);
    assert.equal(media.media(ticket, null, true).status, 404);
  } finally {
    store.close();
  }
});
test('retenção simula, move somente pastas UUID antigas e mantém sete dias de recuperação', () =>
  temporary(async (dir) => {
    const now = Date.now(),
      folder = join(dir, 'local-episodes', id),
      other = join(dir, 'local-episodes', 'manual');
    await mkdir(folder, { recursive: true });
    await mkdir(other);
    await writeFile(join(folder, 'private.json'), 'private');
    const old = (now - 8 * 86_400_000) / 1000;
    await utimes(folder, old, old);
    await utimes(other, old, old);
    assert.equal((await retainEpisodes(dir, false, now)).quarantined, 1);
    assert.ok((await stat(folder)).isDirectory());
    assert.equal((await retainEpisodes(dir, true, now)).quarantined, 1);
    const retired = join(dir, 'retired-episodes', id);
    assert.equal(await readFile(join(retired, 'private.json'), 'utf8'), 'private');
    assert.equal((await retainEpisodes(dir, true, now + 6 * 86_400_000)).removed, 0);
    assert.equal((await retainEpisodes(dir, true, now + 8 * 86_400_000)).removed, 1);
    await assert.rejects(stat(retired));
    assert.ok((await stat(other)).isDirectory());
  }));
test('feedback exige autenticação, valida notas e não aceita conteúdo livre ou episódio indisponível', async () => {
  let received = 0,
    available = true;
  const api = createApi({
    environment: 'development',
    generationAvailable: false,
    allowedOrigins: [],
    authenticate: async (token) => (token === 'valid' ? 'session' : null),
    enqueue: async () => {},
    feedback: async () => {
      received++;
    },
    repository: {
      request: async () => {
        throw new Error();
      },
      job: async () => null,
      audio: async () => null,
      episode: async () =>
        available
          ? {
              id,
              topicId: 'ai',
              title: 'Fixture',
              generatedAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 3600000).toISOString(),
              durationSeconds: 120,
              sources: [],
            }
          : null,
    },
  });
  const call = (body: unknown, token = 'valid') =>
    api(
      new Request(`http://localhost/episodes/${id}/feedback`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );
  assert.equal((await call({ kind: 'content' }, 'other')).status, 401);
  assert.equal((await call({ kind: 'content', text: 'private data' })).status, 400);
  assert.equal((await call({ kind: 'voice-rating', clarity: 10, naturalness: 5 })).status, 400);
  assert.equal((await call({ kind: 'voice-rating', clarity: 4, naturalness: 5 })).status, 202);
  available = false;
  assert.equal((await call({ kind: 'content' })).status, 404);
  assert.equal(received, 1);
});
