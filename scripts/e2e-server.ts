/** Servidor efêmero do CI: conteúdo fictício e sinal sonoro; nunca usa Gemini. */
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { startLocalApi } from '../packages/backend/local-server.ts';
import { editorialFixture, fixtureEditorialModel } from '../packages/backend/editorial-demo.ts';
import { extractEditorialFacts, prepareEditorial } from '../packages/pipeline/editorial.ts';
import { renderEpisode } from '../packages/pipeline/render-episode.ts';
import { ffmpeg } from '../packages/pipeline/binaries.ts';
import { runAudioTool } from '../packages/pipeline/audio.ts';

if (process.env.CI !== 'true' || process.env.AXIOM_E2E !== 'true')
  throw new Error('Este servidor é exclusivo dos testes automatizados do CI.');
const directory = resolve('work', 'native-e2e');
await mkdir(directory, { recursive: true });
if (!ffmpeg) throw new Error('FFmpeg ausente.');
const source = resolve(directory, 'synthetic.mp3');
await runAudioTool(ffmpeg, [
  '-y',
  '-f',
  'lavfi',
  '-i',
  'sine=frequency=440:duration=122',
  '-codec:a',
  'libmp3lame',
  '-b:a',
  '128k',
  source,
]);
const fixture = editorialFixture('ai', new Date()),
  model = fixtureEditorialModel(fixture);
const context = await extractEditorialFacts(fixture.input, model);
const rendered = await renderEpisode({
  directory,
  buildApproved: (words) => prepareEditorial(context, model, words),
  voice: {
    identity: 'axiom-e2e-synthetic',
    synthesize: async () => new Uint8Array(await readFile(source)),
  },
});
const server = await startLocalApi(8787, {
  host: '0.0.0.0',
  publicUrl: 'http://10.0.2.2:8787',
  generation: true,
  processor: async (topic) => {
    if (topic !== 'ai') throw new Error('Tema fora da fixture.');
    return rendered;
  },
});
console.log('E2E pronto: fixture fictícia e áudio técnico, sem fornecedor externo.');
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => server.close(() => process.exit(0)));
