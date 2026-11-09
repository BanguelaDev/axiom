import { mkdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { narrationText } from '../core/src/script.ts';
import { episodeExpiresAt } from '../core/src/news.ts';
import { assertApprovedEditorial, type ApprovedEditorial } from './editorial.ts';
import {
  AudioFault,
  inspectAudio,
  assertAudioQuality,
  correctionRatio,
  prepareAudioFile,
  type PreparedAudio,
} from './audio.ts';
import type { VoiceProvider } from './elevenlabs.ts';

export interface AudioAttempt {
  attempt: number;
  artifactId: string;
  duration: number;
  reusedVoice: boolean;
  outcome: 'rewrite' | 'ready';
}
export interface RenderedEpisode {
  approved: ApprovedEditorial;
  audio: PreparedAudio;
  file: string;
  voiceIdentity: string;
  attempts: AudioAttempt[];
  generatedAt: string;
  expiresAt: string;
}
const sha = (value: Uint8Array | string) => createHash('sha256').update(value).digest('hex');
async function atomicWrite(path: string, value: Uint8Array | string) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, value, { mode: 0o600 });
    await rename(temporary, path);
  } finally {
    await unlink(temporary).catch(() => {});
  }
}
export async function renderEpisode(options: {
  directory: string;
  voice: VoiceProvider;
  buildApproved(targetWords: number, attempt: number): Promise<ApprovedEditorial>;
  clock?: () => Date;
  onAttempt?: (attempt: AudioAttempt) => void;
}): Promise<RenderedEpisode> {
  const clock = options.clock || (() => new Date());
  await mkdir(resolve(options.directory), { recursive: true });
  const attempts: AudioAttempt[] = [];
  let words = 260;
  for (let attempt = 0; attempt < 3; attempt++) {
    const approved = await options.buildApproved(words, attempt);
    assertApprovedEditorial(approved, clock());
    const key = sha(
      JSON.stringify({
        artifactId: approved.artifactId,
        voice: options.voice.identity,
        version: 'audio-v1',
      }),
    );
    const raw = resolve(options.directory, `raw-${key}.mp3`),
      manifest = `${raw}.json`;
    let reusedVoice = false;
    try {
      const recorded = JSON.parse(await readFile(manifest, 'utf8')) as {
        key: string;
        sha256: string;
      };
      if (recorded.key !== key || sha(await readFile(raw)) !== recorded.sha256)
        throw new AudioFault('artifact_changed');
      reusedVoice = true;
    } catch (error) {
      if (error instanceof AudioFault) throw error;
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'))
        throw new AudioFault('artifact_changed');
      // Um arquivo sem manifesto é uma gravação incompleta; não repetir uma cobrança às cegas.
      if (
        await readFile(raw).then(
          () => true,
          () => false,
        )
      )
        throw new AudioFault('artifact_changed');
      assertApprovedEditorial(approved, clock());
      const bytes = await options.voice.synthesize(narrationText(approved.script));
      await atomicWrite(raw, bytes);
      await atomicWrite(manifest, JSON.stringify({ key, sha256: sha(bytes) }));
    }
    const source = await inspectAudio(raw);
    assertAudioQuality(source);
    if (correctionRatio(source.duration) === null) {
      const report: AudioAttempt = {
        attempt: attempt + 1,
        artifactId: approved.artifactId,
        duration: source.duration,
        reusedVoice,
        outcome: 'rewrite',
      };
      attempts.push(report);
      options.onAttempt?.(report);
      words = Math.max(170, Math.min(320, Math.round((words * 120) / source.duration)));
      continue;
    }
    const file = resolve(options.directory, `final-${key}.mp3`);
    const audio = await prepareAudioFile(raw, file);
    assertApprovedEditorial(approved, clock());
    const generated = clock();
    const used = new Set(
      approved.script.claims.flatMap((claim) => claim.evidence.map((item) => item.articleId)),
    );
    const expires = episodeExpiresAt(
      approved.context.articles.filter((article) => used.has(article.id)),
      generated,
    );
    if (expires.getTime() <= generated.getTime()) throw new AudioFault('artifact_changed');
    const report: AudioAttempt = {
      attempt: attempt + 1,
      artifactId: approved.artifactId,
      duration: source.duration,
      reusedVoice,
      outcome: 'ready',
    };
    attempts.push(report);
    options.onAttempt?.(report);
    return {
      approved,
      audio,
      file,
      voiceIdentity: options.voice.identity,
      attempts,
      generatedAt: generated.toISOString(),
      expiresAt: expires.toISOString(),
    };
  }
  throw new AudioFault('attempts_exhausted');
}
export async function verifyRenderedAudio(value: RenderedEpisode, now: Date): Promise<Uint8Array> {
  assertApprovedEditorial(value.approved, now);
  assertAudioQuality(value.audio.metrics, true);
  const bytes = await readFile(value.file);
  if (
    sha(bytes) !== value.audio.sha256 ||
    bytes.length !== value.audio.metrics.bytes ||
    Date.parse(value.expiresAt) <= now.getTime()
  )
    throw new AudioFault('artifact_changed');
  return bytes;
}
