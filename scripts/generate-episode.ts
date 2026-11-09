import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getTopic } from '../packages/core/src/topics.ts';
import { assertSufficientSources, episodeExpiresAt } from '../packages/core/src/news.ts';
import { narrationText, publicEpisode } from '../packages/core/src/script.ts';
import { synthesize, requireEnv } from '../packages/pipeline/providers.ts';
import { createOpenAIEditorialModel } from '../packages/pipeline/openai-editorial.ts';
import {
  extractEditorialFacts,
  prepareEditorial,
  assertApprovedEditorial,
  EditorialFault,
} from '../packages/pipeline/editorial.ts';
import { correctionRatio, finalizeAudio, measureDuration } from '../packages/pipeline/audio.ts';
import { collectNews } from '../packages/pipeline/collect-news.ts';

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
  const selection = await collectNews(topic.id, started, {
    key: requireEnv('GNEWS_API_KEY'),
    registryPath: requireEnv('NEWS_PUBLISHERS_FILE'),
  });
  await writeFile(
    resolve(privateDir, 'selection-report.json'),
    JSON.stringify({ ...selection.report, collection: selection.collection }, null, 2),
    { mode: 0o600 },
  );
  if (selection.report.status !== 'ready')
    throw new Error(
      'Não encontramos notícias recentes suficientes para este tema. A seleção foi registrada para revisão.',
    );
  const articles = selection.articles;
  assertSufficientSources(articles);
  const model = createOpenAIEditorialModel({
    key: requireEnv('OPENAI_API_KEY'),
    model: process.env.OPENAI_MODEL,
  });
  const context = await extractEditorialFacts(
    { topic, articles, referenceAt: started.toISOString() },
    model,
  );
  await writeFile(
    resolve(privateDir, 'facts.json'),
    JSON.stringify({ sourceDigest: context.sourceDigest, facts: context.facts }, null, 2),
    { mode: 0o600 },
  );
  let words = 260;
  for (let attempt = 0; attempt < 3; attempt++) {
    console.log(`Preparando e revisando roteiro (tentativa ${attempt + 1}/3).`);
    const approved = await prepareEditorial(context, model, words).catch(async (error: unknown) => {
      await writeFile(
        resolve(privateDir, `editorial-${attempt}.json`),
        JSON.stringify(
          {
            status: 'blocked',
            code: error instanceof EditorialFault ? error.code : 'model_unavailable',
          },
          null,
          2,
        ),
        { mode: 0o600 },
      );
      throw error;
    });
    const { script } = approved;
    await writeFile(
      resolve(privateDir, `editorial-${attempt}.json`),
      JSON.stringify(
        {
          status: 'approved',
          artifactId: approved.artifactId,
          draft: approved.draft,
          script,
          review: approved.review,
          checkedAt: approved.checkedAt,
          wordCount: approved.wordCount,
          usage: approved.usage,
        },
        null,
        2,
      ),
      { mode: 0o600 },
    );
    const narration = narrationText(script);
    if (narration.split(/\s+/).length > 360)
      throw new Error('Roteiro excessivamente longo; geração interrompida antes do custo de voz.');
    const used = new Set(
      script.claims.flatMap((claim) => claim.evidence.map((evidence) => evidence.articleId)),
    );
    const usedArticles = articles.filter((article) => used.has(article.id));
    assertSufficientSources(usedArticles);
    episodeExpiresAt(usedArticles, new Date());
    const rawPath = resolve(privateDir, `raw-${attempt}.mp3`);
    assertApprovedEditorial(approved, new Date());
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
