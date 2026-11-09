import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getTopic } from '../packages/core/src/topics.ts';
import { assertSufficientSources } from '../packages/core/src/news.ts';
import { publicEpisode } from '../packages/core/src/script.ts';
import { requireEnv } from '../packages/pipeline/providers.ts';
import { createElevenLabsVoice } from '../packages/pipeline/elevenlabs.ts';
import { renderEpisode, verifyRenderedAudio } from '../packages/pipeline/render-episode.ts';
import { createOpenAIEditorialModel } from '../packages/pipeline/openai-editorial.ts';
import {
  extractEditorialFacts,
  prepareEditorial,
  EditorialFault,
} from '../packages/pipeline/editorial.ts';
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
  const voice = createElevenLabsVoice({
    key: requireEnv('ELEVENLABS_API_KEY'),
    voiceId: requireEnv('ELEVENLABS_VOICE_ID'),
    model: process.env.ELEVENLABS_MODEL,
  });
  const rendered = await renderEpisode({
    directory: privateDir,
    voice,
    async buildApproved(words, attempt) {
      console.log(`Preparando e revisando roteiro (tentativa ${attempt + 1}/3).`);
      const approved = await prepareEditorial(context, model, words).catch(
        async (error: unknown) => {
          await writeFile(
            resolve(privateDir, `editorial-${attempt}.json`),
            JSON.stringify({
              status: 'blocked',
              code: error instanceof EditorialFault ? error.code : 'model_unavailable',
            }),
            { mode: 0o600 },
          );
          throw error;
        },
      );
      await writeFile(
        resolve(privateDir, `editorial-${attempt}.json`),
        JSON.stringify(
          {
            artifactId: approved.artifactId,
            draft: approved.draft,
            script: approved.script,
            review: approved.review,
            usage: approved.usage,
          },
          null,
          2,
        ),
        { mode: 0o600 },
      );
      return approved;
    },
  });
  const bytes = await verifyRenderedAudio(rendered, new Date());
  await writeFile(resolve(directory, 'episode.mp3'), bytes);
  await writeFile(
    resolve(privateDir, 'audio-report.json'),
    JSON.stringify(
      { ...rendered.audio, attempts: rendered.attempts, voice: rendered.voiceIdentity },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  await writeFile(
    resolve(privateDir, 'script.json'),
    JSON.stringify(rendered.approved.script, null, 2),
    { mode: 0o600 },
  );
  await writeFile(
    resolve(directory, 'episode.json'),
    JSON.stringify(
      publicEpisode(
        rendered.approved.script,
        articles,
        'episode.mp3',
        new Date(rendered.generatedAt),
        new Date(rendered.expiresAt),
        rendered.audio.metrics.duration,
      ),
      null,
      2,
    ),
  );
  console.log(
    `Amostra local concluída em ${directory}. Duração: ${rendered.audio.metrics.duration.toFixed(2)}s. Requer revisão humana de conteúdo e voz antes de publicação.`,
  );
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
