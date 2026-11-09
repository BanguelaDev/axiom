import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

let db: PGlite;
const userOne = '11111111-1111-4111-8111-111111111111';
const userTwo = '22222222-2222-4222-8222-222222222222';
before(async () => {
  db = await PGlite.create();
  // Somente contratos mínimos de Auth/Storage. Não emula o serviço Supabase inteiro.
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated;
    create schema storage;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to authenticated;
    grant select on storage.objects to authenticated;
    insert into auth.users values('${userOne}'), ('${userTwo}');
  `);
  for (const migration of [
    '202610190001_initial_schema.sql',
    '202611080001_api_foundation.sql',
    '202611080002_complete_generation.sql',
  ])
    await db.exec(
      await readFile(new URL(`../supabase/migrations/${migration}`, import.meta.url), 'utf8'),
    );
});
after(async () => db?.close());
beforeEach(async () => {
  await db.exec(
    'truncate public.generation_requests, public.generation_jobs, public.episodes, private.request_limits cascade;',
  );
});

async function completionPayload(jobId: string) {
  const date = (await db.query<{ now: string }>('select now()::text as now')).rows[0]!.now;
  const generated = new Date(date);
  const checksum = 'a'.repeat(64);
  const payload = {
    topicId: 'ai',
    title: 'Episódio somente para teste',
    generatedAt: generated.toISOString(),
    expiresAt: new Date(generated.getTime() + 1800_000).toISOString(),
    duration: 120,
    audioPath: `${jobId}/${checksum}.mp3`,
    sha256: checksum,
    sources: ['a', 'b'].map((name) => ({
      publisher: `Teste ${name}`,
      title: 'Matéria fictícia',
      url: `https://${name}.example/story`,
      publishedAt: new Date(generated.getTime() - 3600_000).toISOString(),
      editorialGroup: name,
      originGroup: name,
    })),
  };
  await db.query("insert into storage.objects(bucket_id, name) values('episodes', $1)", [
    payload.audioPath,
  ]);
  return {
    payload,
    script: {
      title: payload.title,
      claims: [{ narration: 'Somente teste' }, { narration: 'Outra afirmação de teste' }],
    },
    quality: { sha256: checksum },
  };
}

test('publicação transacional é restrita ao servidor e uma nova confirmação não duplica o episódio', async () => {
  const job = (await request()).job_id!;
  const { payload, script, quality } = await completionPayload(job);
  await assert.rejects(
    asUser(`select public.complete_generation('${job}', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb)`),
    /permission denied/,
  );
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await db.query<{ id: string }>(
      'select public.complete_generation($1,$2,$3,$4) as id',
      [job, payload, script, quality],
    );
    assert.equal(result.rows[0]?.id, job);
  }
  assert.equal((await db.query('select * from public.episodes')).rows.length, 1);
  assert.equal((await db.query('select * from public.episode_sources')).rows.length, 2);
  assert.equal((await db.query('select * from private.episode_quality')).rows.length, 1);
  await assert.rejects(asUser('select * from private.episode_quality'), /permission denied/);
});

test('fontes vencidas e duração inválida não deixam metadados parcialmente prontos', async () => {
  const job = (await request()).job_id!;
  const { payload, script, quality } = await completionPayload(job);
  await assert.rejects(
    db.query('select public.complete_generation($1,$2,$3,$4)', [
      job,
      { ...payload, duration: 150 },
      script,
      quality,
    ]),
    /invalid_episode/,
  );
  const stale = structuredClone(payload);
  stale.sources[0]!.publishedAt = new Date(
    Date.parse(payload.generatedAt) - 73 * 3600_000,
  ).toISOString();
  await assert.rejects(
    db.query('select public.complete_generation($1,$2,$3,$4)', [job, stale, script, quality]),
    /invalid_sources/,
  );
  assert.equal((await db.query('select * from public.episodes')).rows.length, 0);
  assert.equal((await db.query('select * from private.episode_scripts')).rows.length, 0);
  assert.equal(
    (
      await db.query<{ stage: string }>('select stage from public.generation_jobs where id=$1', [
        job,
      ])
    ).rows[0]?.stage,
    'queued',
  );
});

async function asUser(sql: string, user = userOne) {
  return db.transaction(async (tx) => {
    await tx.exec('set local role authenticated');
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [user]);
    return tx.query(sql);
  });
}
async function request(user = userOne, topic = 'ai') {
  return (
    await db.query<{ result: { job_id?: string; episode_id?: string } }>(
      'select public.request_generation($1, $2) as result',
      [user, topic],
    )
  ).rows[0]!.result;
}

test('migrações aplicam; roteiro, áudio e mutações ficam inacessíveis ao cliente', async () => {
  assert.equal((await asUser('select * from public.topics')).rows.length, 6);
  await assert.rejects(asUser('select * from private.episode_scripts'), /permission denied/);
  await assert.rejects(asUser('select audio_path from public.episodes'), /permission denied/);
  await assert.rejects(asUser('select * from public.generation_jobs'), /permission denied/);
  await assert.rejects(
    asUser("insert into public.topics values ('extra', 'Extra')"),
    /permission denied/,
  );
  await assert.rejects(
    asUser(`select public.request_generation('${userOne}', 'ai')`),
    /permission denied/,
  );
  await db.exec(
    "insert into storage.objects(bucket_id, name) values('episodes', 'private/test.mp3')",
  );
  assert.equal((await asUser('select * from storage.objects')).rows.length, 0);
  const bucket = (
    await db.query<{ public: boolean }>("select public from storage.buckets where id = 'episodes'")
  ).rows[0];
  assert.equal(bucket?.public, false);
});

test('pedidos do mesmo tema compartilham trabalho; cada sessão só vê sua associação', async () => {
  const first = await request();
  const second = await request(userTwo);
  assert.equal(first.job_id, second.job_id);
  assert.equal((await db.query('select * from public.generation_jobs')).rows.length, 1);
  assert.equal((await asUser('select * from public.generation_requests')).rows.length, 1);
  assert.equal((await asUser('select * from public.generation_requests', userTwo)).rows.length, 1);
  await assert.rejects(
    db.query(
      "insert into public.generation_jobs(user_id, topic_id, edition_key) values($1, 'ai', 'duplicate')",
      [userOne],
    ),
    /one_active_job_per_topic/,
  );
});

test('quota por sessão e concorrência global são verificadas na reserva', async () => {
  for (let attempt = 0; attempt < 6; attempt++) await request();
  await assert.rejects(request(), /rate_limited/);
  await request(userTwo, 'ukraine');
  await assert.rejects(request(userTwo, 'crime'), /rate_limited/);
  assert.equal((await db.query('select * from public.generation_jobs')).rows.length, 2);
});

test('trabalhos abandonados expiram e uma nova reserva pode ser criada', async () => {
  const first = await request();
  await db.exec("update public.generation_jobs set updated_at = now() - interval '11 minutes'");
  const next = await request();
  assert.notEqual(first.job_id, next.job_id);
  assert.equal(
    (
      await db.query<{ stage: string }>('select stage from public.generation_jobs where id = $1', [
        first.job_id,
      ])
    ).rows[0]?.stage,
    'failed',
  );
});

test('reuso exige fontes ainda nas 72 horas; fontes vencidas forçam novo trabalho', async () => {
  const episode = await db.query<{
    id: string;
  }>(`insert into public.episodes(topic_id, status, title, generated_at, expires_at, duration_seconds, audio_path)
    values('ai', 'ready', 'Somente teste', now() - interval '5 minutes', now() + interval '30 minutes', 120, 'private/test.mp3') returning id`);
  const id = episode.rows[0]!.id;
  await db.query(
    `insert into public.episode_sources(episode_id, publisher, title, url, published_at) values
    ($1, 'Fonte A', 'Teste A', 'https://a.example/story', now() - interval '1 hour'),
    ($1, 'Fonte B', 'Teste B', 'https://b.example/story', now() - interval '2 hours')`,
    [id],
  );
  assert.equal((await request()).episode_id, id);
  await db.query(
    "update public.episode_sources set published_at = now() - interval '73 hours' where episode_id = $1",
    [id],
  );
  assert.ok((await request()).job_id);
});
