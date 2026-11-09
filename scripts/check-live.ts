import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { lanAddress } from '../packages/backend/lan-address.ts';
import { topics } from '../packages/core/src/topics.ts';
import { requestGeneration, getJob, getEpisode, getAudio } from '../packages/core/src/podcast.ts';
import { inspectAudio, assertAudioQuality } from '../packages/pipeline/audio.ts';
import { generationMessages } from '../packages/core/src/api.ts';

const base = `http://${lanAddress()}:8787`;
const sessionResponse = await fetch(`${base}/dev/session`, { method: 'POST' });
if (!sessionResponse.ok) throw new Error('O servidor local não está disponível.');
const session = await sessionResponse.json();
const connection = { url: base, getToken: async () => session.accessToken as string };
const requested = process.argv.slice(2);
const selected = requested.length ? topics.filter((topic) => requested.includes(topic.id)) : topics;
if (!selected.length || (requested.length && selected.length !== new Set(requested).size))
  throw new Error('Confira os identificadores dos temas.');
const output = resolve('work', 'live-check', new Date().toISOString().replace(/[:.]/g, '-'));
await mkdir(output, { recursive: true });
const report: unknown[] = [];
for (const topic of selected) {
  const started = Date.now();
  try {
    console.log(`Validando ${topic.name}...`);
    const result = await requestGeneration(connection, topic.id);
    let episode = result.kind === 'episode' ? result.episode : null;
    if (result.kind === 'job') {
      let job = result.job;
      while (['queued', 'processing'].includes(job.stage) && Date.now() - started < 600_000) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        job = await getJob(connection, job.id);
      }
      if (job.stage !== 'ready' || !job.episodeId) {
        report.push({
          topic: topic.id,
          status: 'blocked',
          reason: job.message,
          seconds: (Date.now() - started) / 1000,
        });
        if (
          job.message === generationMessages.free_quota ||
          ['queued', 'processing'].includes(job.stage)
        )
          break;
        continue;
      }
      episode = await getEpisode(connection, job.episodeId);
    }
    if (!episode) throw new Error();
    const access = await getAudio(connection, episode.id),
      url = new URL(access.url);
    if (url.origin !== base || !url.pathname.startsWith('/dev/media/'))
      throw new Error('Mídia fora do servidor local.');
    const media = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!media.ok) throw new Error();
    const file = resolve(output, `${topic.id}.mp3`);
    await writeFile(file, new Uint8Array(await media.arrayBuffer()));
    const metrics = await inspectAudio(file);
    assertAudioQuality(metrics, true);
    report.push({
      topic: topic.id,
      status: 'ready',
      episode,
      metrics,
      seconds: (Date.now() - started) / 1000,
    });
    console.log(`${topic.name}: áudio conferido em ${metrics.duration.toFixed(2)} segundos.`);
  } catch {
    report.push({ topic: topic.id, status: 'failed', seconds: (Date.now() - started) / 1000 });
  } finally {
    await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
  }
}
console.log(`Relatório: ${resolve(output, 'report.json')}`);
