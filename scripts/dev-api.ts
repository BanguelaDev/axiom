import { startLocalApi } from '../packages/backend/local-server.ts';

const generation =
  process.env.AXIOM_LOCAL_GENERATION !== 'false' && !!process.env.GEMINI_API_KEY?.trim();
const server = await startLocalApi(8787, { generation });
console.log('AXIOM · API local de desenvolvimento em http://127.0.0.1:8787');
console.log(
  generation
    ? 'Geração local: RSS e Gemini Free Tier. Não há fallback para fornecedores pagos; configure uma chave de projeto sem faturamento.'
    : 'Sessões descartáveis; configure GEMINI_API_KEY de um projeto Free Tier para habilitar a geração gratuita.',
);
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => server.close(() => process.exit(0)));
