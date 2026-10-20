import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getTopic } from '../packages/core/src/topics.ts';
import {
  selectArticles,
  assertSufficientSources,
  episodeExpiresAt,
} from '../packages/core/src/news.ts';
import { narrationText, validateEvidence, publicEpisode } from '../packages/core/src/script.ts';
import {
  fetchNews,
  createScript,
  reviewScript,
  synthesize,
  requireEnv,
} from '../packages/pipeline/providers.ts';
import { correctionRatio, finalizeAudio, measureDuration } from '../packages/pipeline/audio.ts';

async function main() {
  const topic = getTopic(process.argv[2] || 'ai');
  if (!topic)
    throw new Error('Tema desconhecido. Use ukraine, ai, mental-health, fraud, politics ou crime.');
  for (const key of [
    'GNEWS_API_KEY',
    'OPENAI_API_KEY',
    'ELEVENLABS_API_KEY',
    'ELEVENLABS_VOICE_ID',
  ])
    requireEnv(key);
  if (process.env.CONTENT_RIGHTS_CONFIRMED !== 'true')
    throw new Error(
      'Confirme as permissões de processamento e narração antes de executar com notícias reais.',
    );
  const started = new Date();
  const directory = resolve('work', `episode-${topic.id}-${started.getTime()}`);
  const privateDir = resolve(directory, 'private');
  await mkdir(privateDir, { recursive: true });
  console.log(`Buscando notícias: ${topic.name}`);
  const articles = selectArticles(await fetchNews(topic, started), started);
  assertSufficientSources(articles);
  let words = 260;
  for (let attempt = 0; attempt < 3; attempt++) {
    console.log(`Preparando e revisando roteiro (tentativa ${attempt + 1}/3).`);
    const script = await createScript(topic, articles, words);
    validateEvidence(script, articles);
    await reviewScript(script, articles, topic);
    const narration = narrationText(script);
    if (narration.split(/\s+/).length > 360)
      throw new Error('Roteiro excessivamente longo; geração interrompida antes do custo de voz.');
    const used = new Set(
      script.claims.flatMap((claim) => claim.evidence.map((evidence) => evidence.articleId)),
    );
    const usedArticles = articles.filter((article) => used.has(article.id));
    episodeExpiresAt(usedArticles, new Date());
    const rawPath = resolve(privateDir, `raw-${attempt}.mp3`);
    await writeFile(rawPath, await synthesize(narration));
    const duration = await measureDuration(rawPath);
    if (correctionRatio(duration) === null) {
      words = Math.max(170, Math.min(320, Math.round((words * 120) / duration)));
      continue;
    }
    const audioPath = resolve(directory, 'episode.mp3');
    const finalDuration = await finalizeAudio(rawPath, audioPath);
    const completed = new Date();
    const expiresAt = episodeExpiresAt(usedArticles, completed);
    await writeFile(resolve(privateDir, 'script.json'), JSON.stringify(script, null, 2), {
      mode: 0o600,
    });
    await writeFile(
      resolve(directory, 'episode.json'),
      JSON.stringify(
        publicEpisode(script, usedArticles, 'episode.mp3', completed, expiresAt, finalDuration),
        null,
        2,
      ),
    );
    console.log(
      `Amostra local concluída em ${directory}. Duração: ${finalDuration.toFixed(2)}s. Requer revisão humana de conteúdo e voz antes de publicação.`,
    );
    return;
  }
  throw new Error('A duração não convergiu após duas correções. Nenhum episódio foi liberado.');
}
main().catch((error: unknown) => {
  // Não imprimir corpos de respostas, URLs com chaves nem detalhes internos dos SDKs.
  const safeMessage =
    error instanceof Error && !/api|fetch|request|token|key/i.test(error.name)
      ? error.message
      : 'Falha na integração. Confira credenciais, quota e conexão.';
  console.error(safeMessage);
  process.exitCode = 1;
});
