import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, readdir, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { ffmpeg } from '../packages/pipeline/binaries.ts';
import {
  runAudioTool,
  inspectAudio,
  assertAudioQuality,
  AudioFault,
  prepareAudioFile,
  correctionRatio,
} from '../packages/pipeline/audio.ts';
import { renderEpisode, verifyRenderedAudio } from '../packages/pipeline/render-episode.ts';
import { editorialFixture, fixtureEditorialModel } from '../packages/backend/editorial-demo.ts';
import { extractEditorialFacts, prepareEditorial } from '../packages/pipeline/editorial.ts';
import { createAudioDemo } from '../packages/backend/audio-demo.ts';
import { createClient } from '@supabase/supabase-js';
import { publishEpisode } from '../packages/pipeline/publish-episode.ts';
import { LocalRepository } from '../packages/backend/local-repository.ts';
import { LocalStore } from '../packages/backend/local-store.ts';

let directory: string;
let normal: Uint8Array, long: Uint8Array;
const now = new Date('2026-11-08T12:00:00Z');
before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'axiom-generation-'));
  assert.ok(ffmpeg);
  for (const [name, duration] of [
    ['normal', 122],
    ['long', 150],
  ] as const) {
    const path = join(directory, `${name}.mp3`);
    await runAudioTool(ffmpeg, [
      '-y',
      '-f',
      'lavfi',
      '-i',
      `sine=frequency=440:duration=${duration}`,
      '-codec:a',
      'libmp3lame',
      '-b:a',
      '128k',
      path,
    ]);
  }
  normal = new Uint8Array(await readFile(join(directory, 'normal.mp3')));
  long = new Uint8Array(await readFile(join(directory, 'long.mp3')));
});
after(async () => {
  const target = resolve(directory);
  if (dirname(target) !== resolve(tmpdir()) || !basename(target).startsWith('axiom-generation-'))
    throw new Error('Destino temporário inesperado.');
  await rm(target, { recursive: true, force: true });
});
async function approvedBuilder() {
  const fixture = editorialFixture('ai', now),
    base = fixtureEditorialModel(fixture),
    options = { clock: () => now };
  const model = {
    ...base,
    async draft(input: Parameters<typeof base.draft>[0]) {
      const value = structuredClone(fixture.draft);
      if (input.targetWords < 260) {
        const text = value.claims[0]!.narration;
        value.claims[0]!.narration = text.slice(0, text.lastIndexOf('.', text.length - 2) + 1);
      }
      return { value, usage: null };
    },
  };
  const context = await extractEditorialFacts(fixture.input, model, options);
  return (words: number) => prepareEditorial(context, model, words, options);
}

test('áudio real é normalizado, reaproveita a síntese e detecta arquivo alterado', async () => {
  let calls = 0;
  const buildApproved = await approvedBuilder();
  const options = {
    directory: join(directory, 'reuse'),
    clock: () => now,
    buildApproved,
    voice: {
      identity: 'test-voice',
      async synthesize() {
        calls++;
        return normal;
      },
    },
  };
  const first = await renderEpisode(options);
  assert.ok(Math.abs(first.audio.metrics.duration - 120) <= 1);
  assert.ok(
    first.audio.metrics.integratedLufs! >= -18 && first.audio.metrics.integratedLufs! <= -14,
  );
  assert.ok(first.audio.metrics.truePeakDb! <= -1);
  const second = await renderEpisode(options);
  assert.equal(calls, 1);
  assert.equal(second.attempts[0]?.reusedVoice, true);
  assert.ok((await verifyRenderedAudio(second, now)).length > 0);
  await writeFile(second.file, 'Arquivo alterado depois da validação.');
  await assert.rejects(
    verifyRenderedAudio(second, now),
    (error: unknown) => error instanceof AudioFault && error.code === 'artifact_changed',
  );
});

test('arquivo temporário de áudio funciona em pastas Windows com caminho extenso', async () => {
  const nested = join(
    directory,
    'presentation-'.repeat(Math.max(1, Math.floor((165 - directory.length) / 13))),
  );
  await mkdir(nested, { recursive: true });
  const output = join(nested, `final-${'a'.repeat(64)}.mp3`);
  const result = await prepareAudioFile(join(directory, 'normal.mp3'), output);
  assert.ok(Math.abs(result.metrics.duration - 120) <= 1);
  assert.ok((await readdir(nested)).every((name) => !name.startsWith('.axiom-')));
});

test('calibração gratuita permite até 10% de ritmo e mantém dois minutos sem corte', async () => {
  assert.equal(correctionRatio(110), null);
  assert.equal(correctionRatio(110, 0.1), 110 / 120);
  assert.equal(correctionRatio(107.9, 0.1), null);
  assert.equal(correctionRatio(132.1, 0.1), null);
  assert.equal(correctionRatio(120, 0.2), null);
  const input = join(directory, 'calibration.wav');
  await runAudioTool(ffmpeg!, [
    '-y',
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=440:duration=110',
    input,
  ]);
  const result = await prepareAudioFile(input, join(directory, 'calibration.mp3'), 0.1);
  assert.ok(Math.abs(result.metrics.duration - 120) <= 1);
});

test('duração fora da margem exige nova revisão, com limite de três versões', async () => {
  const build = await approvedBuilder();
  const targets: number[] = [];
  let calls = 0;
  const rendered = await renderEpisode({
    directory: join(directory, 'rewrite'),
    clock: () => now,
    voice: {
      identity: 'test-rewrite',
      async synthesize() {
        calls++;
        return calls === 1 ? long : normal;
      },
    },
    async buildApproved(words) {
      targets.push(words);
      return build(words);
    },
  });
  assert.equal(rendered.attempts.length, 2);
  assert.equal(calls, 2);
  assert.ok(targets[1]! < targets[0]!);
  let drafts = 0;
  await assert.rejects(
    renderEpisode({
      directory: join(directory, 'exhausted'),
      clock: () => now,
      voice: {
        identity: 'test-exhausted',
        async synthesize() {
          return long;
        },
      },
      async buildApproved(words) {
        drafts++;
        return build(words);
      },
    }),
    (error: unknown) => error instanceof AudioFault && error.code === 'attempts_exhausted',
  );
  assert.equal(drafts, 3);
  assert.ok(
    (await readdir(join(directory, 'exhausted'))).every((name) => !name.startsWith('final-')),
  );
});

test('áudio silencioso, dados inválidos e pausa longa são reprovados por medição', async () => {
  assert.ok(ffmpeg);
  const silence = join(directory, 'silence.mp3');
  await runAudioTool(ffmpeg, [
    '-y',
    '-f',
    'lavfi',
    '-i',
    'anullsrc=r=44100:cl=mono',
    '-t',
    '8',
    silence,
  ]);
  const metrics = await inspectAudio(silence);
  assert.throws(
    () => assertAudioQuality(metrics),
    (error: unknown) => error instanceof AudioFault && error.code === 'excessive_silence',
  );
  const invalid = join(directory, 'invalid.mp3');
  await writeFile(invalid, '{"error":"not audio"}');
  await assert.rejects(
    inspectAudio(invalid),
    (error: unknown) => error instanceof AudioFault && error.code === 'invalid_audio',
  );
  const pause = join(directory, 'pause.mp3');
  await runAudioTool(ffmpeg, [
    '-y',
    '-f',
    'lavfi',
    '-i',
    'sine=duration=2',
    '-f',
    'lavfi',
    '-i',
    'anullsrc=r=44100:cl=mono:d=4',
    '-f',
    'lavfi',
    '-i',
    'sine=duration=2',
    '-filter_complex',
    '[0:a][1:a][2:a]concat=n=3:v=0:a=1',
    pause,
  ]);
  const paused = await inspectAudio(pause);
  assert.ok(paused.longestSilence > 3.9);
  assert.throws(
    () => assertAudioQuality(paused),
    (error: unknown) => error instanceof AudioFault && error.code === 'excessive_silence',
  );
});

test('amostra de dois minutos tem acesso temporário e suporte a leitura parcial', async () => {
  let time = 1000;
  const demo = createAudioDemo(join(directory, 'demo'), () => time);
  const report = await demo.prepare('ready');
  assert.equal(report.status, 'ready');
  assert.ok(Math.abs(report.metrics!.duration - 120) <= 1);
  const ticket = report.mediaPath!.split('/').at(-1)!;
  const partial = demo.media(ticket, 'bytes=0-99');
  assert.equal(partial.status, 206);
  assert.equal((await partial.arrayBuffer()).byteLength, 100);
  assert.equal(demo.media(ticket, 'bytes=999999999-').status, 416);
  time += 600001;
  assert.equal(demo.media(ticket, null).status, 404);
  assert.equal((await demo.prepare('silence')).reason, 'excessive_silence');
  assert.equal((await demo.prepare('long')).reason, 'duration_out_of_range');
});

test('falha de confirmação preserva o objeto privado e a repetição confere o checksum antes de publicar', async () => {
  const rendered = await renderEpisode({
    directory: join(directory, 'publish'),
    clock: () => now,
    buildApproved: await approvedBuilder(),
    voice: {
      identity: 'test-publish',
      async synthesize() {
        return normal;
      },
    },
  });
  const bytes = await readFile(rendered.file);
  const jobId = 'a5693839-40e0-4495-9ffa-c8ae6f34d250';
  let rpcCalls = 0,
    uploads = 0,
    corrupt = false;
  const client = createClient('https://project.supabase.co', 'test-server-key', {
    auth: { persistSession: false },
    global: {
      fetch: async (input, init) => {
        const url = String(input);
        assert.notEqual(init?.method, 'DELETE');
        if (url.includes('/rest/v1/rpc/complete_generation')) {
          rpcCalls++;
          return rpcCalls === 1
            ? Response.json({ message: 'private database trace' }, { status: 503 })
            : Response.json(jobId);
        }
        if (init?.method === 'POST') {
          uploads++;
          return uploads === 1
            ? Response.json({ Key: 'private-test-object' })
            : Response.json({ statusCode: '409', message: 'already exists' }, { status: 409 });
        }
        return new Response(corrupt ? new Uint8Array([1, 2]) : bytes, {
          headers: { 'content-type': 'audio/mpeg' },
        });
      },
    },
  });
  await assert.rejects(
    publishEpisode(client, jobId, rendered, () => now),
    (error: unknown) =>
      error instanceof AudioFault &&
      error.code === 'publication_failed' &&
      !error.message.includes('private database trace'),
  );
  assert.equal(await publishEpisode(client, jobId, rendered, () => now), jobId);
  corrupt = true;
  await assert.rejects(
    publishEpisode(client, jobId, rendered, () => now),
    (error: unknown) => error instanceof AudioFault && error.code === 'artifact_changed',
  );
  assert.equal(rpcCalls, 2);
});

test('fila local compartilha trabalho, persiste áudio aprovado, isola sessões e recupera após reinício', async (t) => {
  const rendered = await renderEpisode({
    directory: join(directory, 'local-repo'),
    clock: () => now,
    buildApproved: await approvedBuilder(),
    voice: {
      identity: 'test-local',
      async synthesize() {
        return normal;
      },
    },
  });
  let time = now.getTime(),
    calls = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let store = new LocalStore(join(directory, 'repository.sqlite'));
  let repository = new LocalRepository(
    async () => {
      calls++;
      await gate;
      return rendered;
    },
    (_bytes, expiresIn) => ({ url: 'https://media.example/temporary', expiresIn }),
    () => time,
    store,
  );
  t.after(() => {
    repository.close();
    store.close();
  });
  const first = await repository.request('user-one', 'ai');
  assert.equal(first.kind, 'job');
  if (first.kind !== 'job') throw new Error();
  const second = await repository.request('user-two', 'ai');
  assert.equal(second.kind, 'job');
  if (second.kind !== 'job') throw new Error();
  assert.equal(first.job.id, second.job.id);
  assert.equal(await repository.job('unknown', first.job.id), null);
  await repository.enqueue(first.job.id);
  await repository.enqueue(first.job.id);
  release();
  for (let attempt = 0; attempt < 50; attempt++) {
    if ((await repository.job('user-one', first.job.id))?.stage === 'ready') break;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.equal(calls, 1);
  assert.equal((await repository.job('user-two', first.job.id))?.stage, 'ready');
  const episode = await repository.episode(first.job.id);
  assert.ok(episode);
  assert.ok(Math.abs(episode.durationSeconds - 120) <= 1);
  assert.doesNotMatch(JSON.stringify(episode), /"script"|"quote"|"narration"|"artifactId"/);
  assert.equal((await repository.audio(first.job.id))?.expiresIn, 300);
  assert.equal((await repository.request('user-three', 'ai')).kind, 'episode');
  repository.close();
  store.close();
  store = new LocalStore(join(directory, 'repository.sqlite'));
  repository = new LocalRepository(
    async () => {
      calls++;
      throw new Error('Cache recuperado não deve gerar novamente.');
    },
    (_bytes, expiresIn) => ({ url: 'https://media.example/restored', expiresIn }),
    () => time,
    store,
  );
  assert.equal((await repository.job('user-one', first.job.id))?.stage, 'ready');
  assert.equal(await repository.job('unknown', first.job.id), null);
  assert.equal((await repository.episode(first.job.id))?.title, episode.title);
  assert.equal((await repository.audio(first.job.id))?.url, 'https://media.example/restored');
  assert.equal((await repository.request('user-four', 'ai')).kind, 'episode');
  assert.equal(calls, 1);
  store.withdraw(first.job.id,time);
  assert.equal(await repository.episode(first.job.id),null);
  assert.equal(await repository.audio(first.job.id),null);
  time += 3_600_001;
  assert.equal(await repository.episode(first.job.id), null);
  assert.equal(await repository.audio(first.job.id), null);
  const next = await Promise.all([
    repository.request('user-new-one', 'ai'),
    repository.request('user-new-two', 'ai'),
  ]);
  assert.ok(next.every((value) => value.kind === 'job'));
  if (next[0]?.kind === 'job' && next[1]?.kind === 'job')
    assert.equal(next[0].job.id, next[1].job.id);
});
