import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createAudioDemo } from '../packages/backend/audio-demo.ts';

const directory = resolve('work', 'audio-audit');
await mkdir(directory, { recursive: true });
const demo = createAudioDemo(directory);
for (const scenario of ['ready', 'silence', 'long'] as const) {
  const result = await demo.prepare(scenario);
  if (scenario === 'ready' ? result.status !== 'ready' : result.status !== 'blocked')
    throw new Error('Auditoria técnica incompatível.');
  await writeFile(
    resolve(directory, `${scenario}.json`),
    JSON.stringify({ ...result, mediaPath: null, expiresIn: 0 }, null, 2),
  );
  console.log(
    `${scenario}: ${result.status}; duração ${result.metrics?.duration.toFixed(2)}s; ${result.reason || 'controle técnico aprovado'}.`,
  );
}
console.log(
  'Sinal técnico sem voz ou notícias em work/audio-audit/technical-sample.mp3. Nenhum fornecedor foi consultado.',
);
