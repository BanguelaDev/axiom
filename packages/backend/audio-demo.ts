import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { ffmpeg } from '../pipeline/binaries.ts';
import {
  runAudioTool,
  prepareAudioFile,
  inspectAudio,
  assertAudioQuality,
  correctionRatio,
  AudioFault,
} from '../pipeline/audio.ts';
import type { AudioMetrics, AudioDemoReport } from '../core/src/audio-report.ts';
export type AudioScenario = 'ready' | 'silence' | 'long';
export function createAudioDemo(directory: string, clock = () => Date.now()) {
  const builds = new Map<
    AudioScenario,
    Promise<{ metrics: AudioMetrics; bytes: Uint8Array | null; reason: AudioDemoReport['reason'] }>
  >();
  const tickets = new Map<string, { bytes: Uint8Array; expires: number }>();
  async function build(scenario: AudioScenario) {
    if (!ffmpeg) throw new AudioFault('processing_failed');
    await mkdir(directory, { recursive: true });
    const input = resolve(directory, `${scenario}-source.mp3`);
    const source =
      scenario === 'silence'
        ? 'anullsrc=r=44100:cl=mono'
        : `sine=frequency=440:duration=${scenario === 'long' ? 150 : 122}`;
    await runAudioTool(ffmpeg, [
      '-nostdin',
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-f',
      'lavfi',
      '-i',
      source,
      '-t',
      scenario === 'silence' ? '120' : scenario === 'long' ? '150' : '122',
      '-codec:a',
      'libmp3lame',
      '-b:a',
      '128k',
      input,
    ]);
    const metrics = await inspectAudio(input);
    try {
      assertAudioQuality(metrics);
      if (correctionRatio(metrics.duration) === null) throw new AudioFault('duration_out_of_range');
      const output = resolve(directory, 'technical-sample.mp3');
      const prepared = await prepareAudioFile(input, output);
      return {
        metrics: prepared.metrics,
        bytes: new Uint8Array(await readFile(output)),
        reason: null,
      };
    } catch (error) {
      if (!(error instanceof AudioFault)) throw error;
      return { metrics, bytes: null, reason: error.code };
    }
  }
  return {
    issueMedia(bytes:Uint8Array,expiresIn=300) {
      for(const [ticket,value] of tickets)if(value.expires<=clock())tickets.delete(ticket);
      if(tickets.size>=64)tickets.delete(tickets.keys().next().value!);
      const ticket=randomBytes(24).toString('hex');
      const ttl=Math.max(1,Math.min(600,Math.floor(expiresIn)));
      tickets.set(ticket,{bytes,expires:clock()+ttl*1000});
      return {path:`/dev/media/${ticket}`,expiresIn:ttl};
    },
    async prepare(scenario: AudioScenario): Promise<AudioDemoReport> {
      if (!builds.has(scenario))
        builds.set(
          scenario,
          build(scenario).catch((error) => {
            builds.delete(scenario);
            throw error;
          }),
        );
      const result = await builds.get(scenario)!;
      if (!result.bytes)
        return {
          synthetic: true,
          status: 'blocked',
          reason: result.reason,
          metrics: result.metrics,
          mediaPath: null,
          expiresIn: 0,
        };
      for (const [ticket, value] of tickets) if (value.expires <= clock()) tickets.delete(ticket);
      if (tickets.size >= 64) tickets.delete(tickets.keys().next().value!);
      const ticket = randomBytes(24).toString('hex');
      tickets.set(ticket, { bytes: result.bytes, expires: clock() + 600_000 });
      return {
        synthetic: true,
        status: 'ready',
        reason: null,
        metrics: result.metrics,
        mediaPath: `/dev/media/${ticket}`,
        expiresIn: 600,
      };
    },
    media(ticket: string, range: string | null, head = false): Response {
      const stored = tickets.get(ticket);
      if (!stored || stored.expires <= clock()) {
        tickets.delete(ticket);
        return new Response(null, { status: 404 });
      }
      const total = stored.bytes.length;
      const headers = new Headers({
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'private, no-store',
        'Accept-Ranges': 'bytes',
      });
      let start = 0,
        end = total - 1;
      if (range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (!match || (!match[1] && !match[2]))
          return new Response(null, {
            status: 416,
            headers: { 'Content-Range': `bytes */${total}` },
          });
        start = match[1] ? Number(match[1]) : Math.max(0, total - Number(match[2]));
        end = match[1] && match[2] ? Math.min(total - 1, Number(match[2])) : total - 1;
        if (
          !Number.isSafeInteger(start) ||
          !Number.isSafeInteger(end) ||
          start >= total ||
          start < 0 ||
          end < start
        )
          return new Response(null, {
            status: 416,
            headers: { 'Content-Range': `bytes */${total}` },
          });
        headers.set('Content-Range', `bytes ${start}-${end}/${total}`);
      }
      headers.set('Content-Length', String(end - start + 1));
      return new Response(head ? null : stored.bytes.slice(start, end + 1), {
        status: range ? 206 : 200,
        headers,
      });
    },
  };
}
