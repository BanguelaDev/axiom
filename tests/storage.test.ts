import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { SupabaseRepository } from '../packages/backend/supabase-repository.ts';

function repository(options: { expired?: boolean; staleSource?: boolean; absent?: boolean } = {}) {
  let signatures = 0;
  let ttl = 0;
  const client = createClient('https://project.supabase.co', 'server-key-for-test-only', {
    auth: { persistSession: false },
    global: {
      fetch: async (input, init) => {
        const url = new URL(String(input));
        if (url.pathname.includes('/storage/v1/object/sign/')) {
          signatures++;
          ttl = JSON.parse(String(init?.body)).expiresIn;
          return Response.json({ signedURL: '/object/sign/episodes/test.mp3?token=temporary' });
        }
        assert.equal(url.searchParams.get('status'), 'eq.ready');
        const select = url.searchParams.get('select') || '';
        if (select === 'audio_path') return Response.json({ audio_path: 'test.mp3' });
        assert.ok(url.searchParams.has('expires_at'));
        if (options.absent) return Response.json(null);
        return Response.json({
          id: 'episode',
          topic_id: 'ai',
          title: 'Somente teste',
          generated_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + (options.expired ? -60_000 : 60_000)).toISOString(),
          duration_seconds: 120,
          episode_sources: ['A', 'B'].map((publisher) => ({
            publisher,
            title: 'Teste',
            url: `https://${publisher.toLowerCase()}.example/story`,
            published_at: new Date(
              Date.now() - (options.staleSource ? 73 : 1) * 3600_000,
            ).toISOString(),
          })),
        });
      },
    },
  });
  return { repo: new SupabaseRepository(client), signatures: () => signatures, ttl: () => ttl };
}

test('acesso ao áudio recebe URL temporária limitada pela validade do episódio', async () => {
  const { repo, signatures, ttl } = repository();
  const episode = await repo.episode('episode');
  assert.ok(episode);
  assert.deepEqual(Object.keys(episode).sort(), [
    'durationSeconds',
    'expiresAt',
    'generatedAt',
    'id',
    'sources',
    'title',
    'topicId',
  ]);
  const audio = await repo.audio('episode');
  assert.ok(audio?.url.startsWith('https://project.supabase.co/storage/v1/object/sign/'));
  assert.ok(ttl() >= 1 && ttl() <= 60);
  assert.equal(signatures(), 1);
});

test('episódio ausente, vencido ou com fonte antiga não ganha nova URL de áudio', async () => {
  for (const options of [{ absent: true }, { expired: true }, { staleSource: true }]) {
    const { repo, signatures } = repository(options);
    assert.equal(await repo.audio('episode'), null);
    assert.equal(signatures(), 0);
  }
});
