import { existsSync } from 'node:fs';
import { ffmpeg, ffprobe } from '../packages/pipeline/binaries.ts';
import { loadPublisherRegistry } from '../packages/pipeline/collect-news.ts';
const names = ['GNEWS_API_KEY', 'OPENAI_API_KEY', 'ELEVENLABS_API_KEY', 'ELEVENLABS_VOICE_ID'];
const missing = names.filter((name) => !process.env[name]?.trim());
const binariesAvailable = !!ffmpeg && existsSync(ffmpeg) && existsSync(ffprobe.path);
let publishersAvailable = false;
try {
  publishersAvailable =
    (await loadPublisherRegistry(process.env.NEWS_PUBLISHERS_FILE || '')).length > 0;
} catch {
  /* Configuração ausente; nenhum caminho privado é exibido. */
}
console.log(`Cadastro de fontes revisadas: ${publishersAvailable ? 'configurado' : 'pendente'}`);
for (const name of names)
  console.log(`${name}: ${missing.includes(name) ? 'pendente' : 'configurado'}`);
console.log(`FFmpeg: ${ffmpeg && existsSync(ffmpeg) ? 'disponível' : 'pendente'}`);
console.log(`FFprobe: ${existsSync(ffprobe.path) ? 'disponível' : 'pendente'}`);
console.log(
  `Direitos de conteúdo: ${process.env.CONTENT_RIGHTS_CONFIRMED === 'true' ? 'confirmados pelo responsável' : 'pendentes de confirmação'}`,
);
if (
  missing.length ||
  !binariesAvailable ||
  !publishersAvailable ||
  process.env.CONTENT_RIGHTS_CONFIRMED !== 'true'
) {
  console.log(
    'A validação real ainda não pode ser concluída. Copie .env.example para .env e configure localmente. Nenhum segredo é exibido por este comando.',
  );
  process.exitCode = 1;
}
