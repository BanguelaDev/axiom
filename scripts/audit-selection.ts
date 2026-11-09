import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { topics } from '../packages/core/src/topics.ts';
import { createSelectionDemo } from '../packages/backend/selection-demo.ts';

const reference = new Date();
const directory = resolve('work', 'selection-demo');
await mkdir(directory, { recursive: true });
for (const topic of topics) {
  const result = createSelectionDemo(topic.id, reference);
  await writeFile(resolve(directory, `${topic.id}.json`), JSON.stringify(result, null, 2));
  console.log(
    `${topic.name}: ${result.report.selected}/${result.report.received} matérias fictícias selecionadas; ${result.report.independentSources} grupos.`,
  );
}
console.log('Auditoria local de exemplos fictícios concluída. Nenhum fornecedor foi consultado.');
