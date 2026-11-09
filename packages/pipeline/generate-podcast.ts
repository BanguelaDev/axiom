import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getTopic } from '../core/src/topics.ts';
import { assertSufficientSources } from '../core/src/news.ts';
import { publicEpisode } from '../core/src/script.ts';
import { requireEnv } from './providers.ts';
import { createGeminiEditorialModel, createGeminiVoice } from './gemini.ts';
import { renderEpisode, verifyRenderedAudio } from './render-episode.ts';
import { extractEditorialFacts, EditorialFault } from './editorial.ts';
import { prepareWithRepair } from './editorial-repair.ts';
import { collectRss, InsufficientNewsFault } from './rss.ts';
import type { GeminiOptions } from './gemini.ts';

export async function generatePodcast(
  topicId: string,
  directory: string,
  onPhase: (phase: string) => Promise<void> = async () => {},
  options: {
    rememberPublication?: (url: string, publishedAt: string) => string;
    onUsage?: GeminiOptions['onUsage'];
    onNarration?: (characters: number) => Promise<void>;
  } = {},
) {
  const topic = getTopic(topicId);
  if (!topic)
    throw new Error('Tema desconhecido. Use ukraine, ai, mental-health, fraud, politics ou crime.');
  // Fluxo ativo de custo zero: RSS público e uma chave de projeto Gemini Free Tier.
  const geminiKey = requireEnv('GEMINI_API_KEY');
  const started = new Date();
  const privateDir = resolve(directory, 'private');
  await mkdir(privateDir, { recursive: true });
  await onPhase('collecting');
  const selection = await collectRss(topic.id, started, fetch, options.rememberPublication);
  await writeFile(
    resolve(privateDir, 'selection-report.json'),
    JSON.stringify({ ...selection.report, collection: selection.collection }, null, 2),
    { mode: 0o600 },
  );
  if (selection.report.status !== 'ready') throw new InsufficientNewsFault();
  const articles = selection.articles;
  assertSufficientSources(articles);
  await onPhase('writing');
  const model = createGeminiEditorialModel({
    key: geminiKey,
    onUsage: options.onUsage,
    async onResult(stage, value) {
      if (!['axiom_facts', 'axiom_draft', 'axiom_review', 'axiom_extraction_audit'].includes(stage))
        throw new Error('Etapa inválida.');
      await writeFile(resolve(privateDir, `${stage}.json`), JSON.stringify(value, null, 2), {
        mode: 0o600,
      });
    },
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
  const provider = createGeminiVoice({ key: geminiKey, onUsage: options.onUsage });
  const voice = {
    identity: provider.identity,
    async synthesize(text: string) {
      await options.onNarration?.(text.length);
      return provider.synthesize(text);
    },
  };
  const rendered = await renderEpisode({
    directory: privateDir,
    voice,
    // Calibração da narração gratuita: até 10%, sem corte nem preenchimento com silêncio.
    maxTempoChange: 0.1,
    async buildApproved(words, attempt) {
      await onPhase('writing');
      const approved = await prepareWithRepair(context, model, words, async (revision) => {
        await writeFile(
          resolve(privateDir, `editorial-repair-${attempt}.json`),
          JSON.stringify(revision, null, 2),
          { mode: 0o600 },
        );
      }).catch(async (error: unknown) => {
        await writeFile(
          resolve(privateDir, `editorial-${attempt}.json`),
          JSON.stringify({
            status: 'blocked',
            code: error instanceof EditorialFault ? error.code : 'model_unavailable',
          }),
          { mode: 0o600 },
        );
        throw error;
      });
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
      await onPhase('audio');
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
  return rendered;
}
