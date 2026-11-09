import { startLocalApi } from '../packages/backend/local-server.ts';
import { resolve } from 'node:path';
import { lanAddress } from '../packages/backend/lan-address.ts';

const generation =
  process.env.AXIOM_LOCAL_GENERATION !== 'false' && !!process.env.GEMINI_API_KEY?.trim();
const lan = process.argv.includes('--lan');
const url = `http://${lan ? lanAddress() : '127.0.0.1'}:8787`;
const server = await startLocalApi(8787, {
  generation,
  host: lan ? '0.0.0.0' : '127.0.0.1',
  publicUrl: url,
  statePath: resolve('work', 'data', 'axiom.sqlite'),
});
console.log(`AXIOM · Servidor no computador: ${url}`);
console.log(
  generation
    ? 'Geração local: RSS e Gemini Free Tier. Não há fallback para fornecedores pagos; configure uma chave de projeto sem faturamento.'
    : 'Estado local persistido; configure GEMINI_API_KEY de um projeto Free Tier para habilitar a geração gratuita.',
);
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => server.close(() => process.exit(0)));
