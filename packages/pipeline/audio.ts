import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { stat, readFile, rename, unlink } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { ffmpeg, ffprobe } from './binaries.ts';
import { audioFailures, type AudioFailure, type AudioMetrics } from '../core/src/audio-report.ts';
const execute = promisify(execFile);
export class AudioFault extends Error {
  constructor(public readonly code: AudioFailure) {
    super(audioFailures[code]);
  }
}
export async function runAudioTool(binary: string, args: string[]) {
  try {
    return await execute(binary, args, {
      timeout: 45_000,
      maxBuffer: 1024 * 1024,
      windowsHide: true,
    });
  } catch {
    throw new AudioFault('processing_failed');
  }
}
async function probe(file: string) {
  const path = resolve(file);
  let size: number;
  try {
    const info = await stat(path);
    if (!info.isFile()) throw new Error();
    size = info.size;
  } catch {
    throw new AudioFault('invalid_audio');
  }
  if (size <= 0 || size > 32 * 1024 * 1024) throw new AudioFault('invalid_audio');
  try {
    const { stdout } = await runAudioTool(ffprobe.path, [
      '-v',
      'error',
      '-protocol_whitelist',
      'file,pipe',
      '-show_entries',
      'format=duration:stream=codec_name,codec_type,sample_rate,channels',
      '-of',
      'json',
      path,
    ]);
    const data = JSON.parse(stdout) as {
      format: { duration: string };
      streams: { codec_name: string; codec_type: string; sample_rate: string; channels: number }[];
    };
    const stream = data.streams[0];
    const duration = Number(data.format.duration);
    if (
      data.streams.length !== 1 ||
      !stream ||
      stream.codec_type !== 'audio' ||
      !['mp3', 'pcm_s16le', 'pcm_f32le', 'pcm_s24le'].includes(stream.codec_name) ||
      ![1, 2].includes(stream.channels) ||
      !Number.isFinite(duration) ||
      duration <= 0 ||
      duration > 300
    )
      throw new Error();
    return {
      path,
      duration,
      codec: stream.codec_name,
      sampleRate: Number(stream.sample_rate),
      channels: stream.channels,
      bytes: size,
    };
  } catch {
    throw new AudioFault('invalid_audio');
  }
}
export async function measureDuration(file: string): Promise<number> {
  return (await probe(file)).duration;
}
export function correctionRatio(duration: number, maxTempoChange = 0.03): number | null {
  if (!Number.isFinite(maxTempoChange) || maxTempoChange < 0 || maxTempoChange > 0.1) return null;
  const ratio = duration / 120;
  return Number.isFinite(duration) && ratio >= 1 - maxTempoChange && ratio <= 1 + maxTempoChange
    ? ratio
    : null;
}
export async function inspectAudio(file: string): Promise<AudioMetrics> {
  if (!ffmpeg) throw new AudioFault('processing_failed');
  const { path, ...metadata } = await probe(file);
  const { stderr } = await runAudioTool(ffmpeg, [
    '-nostdin',
    '-hide_banner',
    '-nostats',
    '-protocol_whitelist',
    'file,pipe',
    '-i',
    path,
    '-vn',
    '-af',
    'silencedetect=noise=-45dB:d=0.5,loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json',
    '-f',
    'null',
    '-',
  ]);
  let silenceSeconds = 0,
    longestSilence = 0,
    start: number | null = null;
  for (const line of stderr.split('\n')) {
    const beginning = /silence_start:\s*([\d.]+)/.exec(line),
      ending = /silence_end:\s*([\d.]+)/.exec(line);
    if (beginning) start = Number(beginning[1]);
    if (ending && start !== null) {
      const length = Math.max(0, Number(ending[1]) - start);
      silenceSeconds += length;
      longestSilence = Math.max(longestSilence, length);
      start = null;
    }
  }
  if (start !== null) {
    const length = Math.max(0, metadata.duration - start);
    silenceSeconds += length;
    longestSilence = Math.max(longestSilence, length);
  }
  const json = stderr.match(/\{\s*"input_i"[\s\S]*?\}/)?.[0];
  if (!json) throw new AudioFault('processing_failed');
  const levels = JSON.parse(json) as { input_i: string; input_tp: string };
  const finite = (value: string) => (Number.isFinite(Number(value)) ? Number(value) : null);
  return {
    ...metadata,
    integratedLufs: finite(levels.input_i),
    truePeakDb: finite(levels.input_tp),
    silenceSeconds,
    longestSilence,
  };
}
export function assertAudioQuality(metrics: AudioMetrics, final = false): void {
  if (
    !Number.isFinite(metrics.duration) ||
    metrics.duration <= 0 ||
    !Number.isFinite(metrics.bytes) ||
    metrics.bytes <= 0 ||
    !Number.isFinite(metrics.silenceSeconds) ||
    !Number.isFinite(metrics.longestSilence) ||
    metrics.silenceSeconds < 0 ||
    metrics.longestSilence < 0
  )
    throw new AudioFault('invalid_audio');
  if (
    metrics.integratedLufs === null ||
    !Number.isFinite(metrics.integratedLufs) ||
    metrics.truePeakDb === null ||
    !Number.isFinite(metrics.truePeakDb) ||
    metrics.longestSilence > 3 ||
    metrics.silenceSeconds / metrics.duration > 0.15
  )
    throw new AudioFault('excessive_silence');
  if (
    final &&
    (metrics.bytes > 10 * 1024 * 1024 ||
      metrics.codec !== 'mp3' ||
      metrics.sampleRate !== 44100 ||
      Math.abs(metrics.duration - 120) > 1)
  )
    throw new AudioFault('invalid_audio');
  if (
    final &&
    (metrics.integratedLufs < -18 || metrics.integratedLufs > -14 || metrics.truePeakDb > -1)
  )
    throw new AudioFault('invalid_volume');
}
export interface PreparedAudio {
  metrics: AudioMetrics;
  sha256: string;
}
export async function prepareAudioFile(
  input: string,
  output: string,
  maxTempoChange = 0.03,
): Promise<PreparedAudio> {
  if (!ffmpeg || resolve(input) === resolve(output)) throw new AudioFault('processing_failed');
  const source = await inspectAudio(input);
  assertAudioQuality(source);
  const ratio = correctionRatio(source.duration, maxTempoChange);
  if (ratio === null) throw new AudioFault('duration_out_of_range');
  // FFprobe para Windows não aceita caminhos longos em todos os builds.
  // Usar um nome curto no mesmo diretório preserva a renomeação atômica.
  const temporary = join(dirname(resolve(output)), `.axiom-${randomUUID().slice(0, 8)}.mp3`);
  try {
    // Sem corte, preenchimento artificial ou remoção de pausas: só ajuste limitado de ritmo e volume.
    await runAudioTool(ffmpeg, [
      '-nostdin',
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-protocol_whitelist',
      'file,pipe',
      '-i',
      resolve(input),
      '-vn',
      '-map_metadata',
      '-1',
      '-af',
      `atempo=${ratio},loudnorm=I=-16:TP=-1.5:LRA=11`,
      '-ar',
      '44100',
      '-ac',
      '1',
      '-codec:a',
      'libmp3lame',
      '-b:a',
      '128k',
      temporary,
    ]);
    const metrics = await inspectAudio(temporary);
    assertAudioQuality(metrics, true);
    const sha256 = createHash('sha256')
      .update(await readFile(temporary))
      .digest('hex');
    await rename(temporary, resolve(output));
    return { metrics, sha256 };
  } finally {
    await unlink(temporary).catch(() => {});
  }
}
export async function finalizeAudio(input: string, output: string): Promise<number> {
  return (await prepareAudioFile(input, output)).metrics.duration;
}
