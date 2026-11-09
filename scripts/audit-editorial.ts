import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { topics } from '../packages/core/src/topics.ts';
import { createEditorialDemo } from '../packages/backend/editorial-demo.ts';

const now = new Date();
const directory = resolve('work', 'editorial-demo');
await mkdir(directory, { recursive: true });
for (const topic of topics) {
  const reports = await Promise.all(
    (['approved', 'missing_evidence', 'contradiction'] as const).map((scenario) =>
      createEditorialDemo(topic.id, scenario, now),
    ),
  );
  if (
    reports[0]!.status !== 'approved' ||
    reports[1]!.reason !== 'invalid_evidence' ||
    reports[2]!.reason !== 'review_rejected'
  )
    throw new Error(`Cenário editorial incompatível em ${topic.id}.`);
  await writeFile(resolve(directory, `${topic.id}.json`), JSON.stringify(reports, null, 2));
  console.log(
    `${topic.name}: fluxo fictício aprovado; evidência ausente e contradição bloqueadas.`,
  );
}
console.log(
  'Auditoria de demonstração concluída. Não usa IA real, notícias ou voz; não expõe o roteiro.',
);
