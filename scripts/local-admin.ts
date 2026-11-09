import { resolve } from 'node:path';
import { LocalStore } from '../packages/backend/local-store.ts';
import { retainEpisodes } from '../packages/backend/retention.ts';
import { isId } from '../packages/core/src/podcast.ts';
const [command, id] = process.argv.slice(2);
const store = new LocalStore(resolve('work', 'data', 'axiom.sqlite'));
try {
  if (command === 'withdraw') {
    if (!isId(id)) throw new Error('Informe o UUID do episódio.');
    store.withdraw(id!);
    console.log(
      'Episódio retirado. Novos acessos, inclusive links já emitidos, serão recusados. Áudio já recebido pelo aparelho não pode ser recolhido.',
    );
  } else if (command === 'report') console.log(JSON.stringify(store.report(), null, 2));
  else if (command === 'retention') {
    const apply = process.argv.includes('--apply');
    console.log(JSON.stringify(await retainEpisodes(resolve('work'), apply), null, 2));
    if (apply) store.prune();
    else console.log('Simulação. Use --apply para aplicar a política documentada.');
  } else throw new Error('Use: npm run admin -- report | withdraw <UUID> | retention [--apply]');
} finally {
  store.close();
}
