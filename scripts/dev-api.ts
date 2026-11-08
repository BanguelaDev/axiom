import { startLocalApi } from '../packages/backend/local-server.ts';

const server = await startLocalApi();
console.log('AXIOM · API local de desenvolvimento em http://127.0.0.1:8787');
console.log('Sessões descartáveis; geração real desativada. Nenhuma chave externa é usada.');
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => server.close(() => process.exit(0)));
