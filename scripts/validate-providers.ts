import { existsSync } from 'node:fs';
import { ffmpeg, ffprobe } from '../packages/pipeline/binaries.ts';
console.log('Fluxo ativo: RSS público + Gemini Free Tier; sem fallback pago.');
const key = !!process.env.GEMINI_API_KEY?.trim();
console.log('GEMINI_API_KEY: ' + (key ? 'configurado' : 'pendente'));
console.log('FFmpeg: ' + (ffmpeg && existsSync(ffmpeg) ? 'disponível' : 'pendente'));
console.log('FFprobe: ' + (existsSync(ffprobe.path) ? 'disponível' : 'pendente'));
console.log('GNews, OpenAI e ElevenLabs: não usados no fluxo atual.');
console.log(
  'Use projeto Gemini com Plan = Free, sem faturamento. Esta conferência não consulta saldo nem faz chamadas à IA.',
);
if (!key || !ffmpeg || !existsSync(ffmpeg) || !existsSync(ffprobe.path)) process.exitCode = 1;
