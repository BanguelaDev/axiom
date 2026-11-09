import { randomUUID } from 'node:crypto';
import {
  ApiFault,
  generationMessages,
  type PublicEpisode,
  type PublicJob,
  type GenerationResult,
} from '../core/src/api.ts';
import type { TopicId } from '../core/src/topics.ts';
import type { BackendRepository } from './handler.ts';
import { verifyRenderedAudio, type RenderedEpisode } from '../pipeline/render-episode.ts';
import { GeminiQuotaFault } from '../pipeline/gemini.ts';
import { InsufficientNewsFault } from '../pipeline/rss.ts';

type Work = { job: PublicJob; users: Set<string>; updated: number; rendered?: RenderedEpisode };
export type Processor = (
  topic: TopicId,
  jobId: string,
  onPhase: (phase: string) => Promise<void>,
) => Promise<RenderedEpisode>;
/** Ambiente local em memória. O pipeline é real; Auth, banco e fila remotos não são emulados. */
export class LocalRepository implements BackendRepository {
  private jobs = new Map<string, Work>();
  private requests = new Map<string, number[]>();
  private reservations: number[] = [];
  constructor(
    private readonly process: Processor,
    private readonly issueAudio: (
      bytes: Uint8Array,
      expiresIn: number,
    ) => { url: string; expiresIn: number },
    private readonly clock = () => Date.now(),
  ) {}
  async request(userId: string, topicId: TopicId): Promise<GenerationResult> {
    const now = this.clock();
    const usage = (this.requests.get(userId) || []).filter((time) => time > now - 3_600_000);
    if (usage.length >= 12 || usage.filter((time) => time > now - 60_000).length >= 6)
      throw new ApiFault('rate_limited', 429);
    usage.push(now);
    this.requests.set(userId, usage);
    for (const [id, work] of this.jobs) {
      if (work.job.topicId !== topicId) continue;
      if (work.job.stage === 'ready') {
        const episode = await this.episode(id);
        if (episode) return { kind: 'episode', episode };
      }
      if (['queued', 'processing'].includes(work.job.stage) && work.updated > now - 600_000) {
        work.users.add(userId);
        return { kind: 'job', job: { ...work.job } };
      }
    }
    this.reservations = this.reservations.filter((time) => time > now - 3_600_000);
    if (
      this.reservations.length >= 30 ||
      [...this.jobs.values()].filter(
        (work) => ['queued', 'processing'].includes(work.job.stage) && work.updated > now - 600_000,
      ).length >= 2
    )
      throw new ApiFault('rate_limited', 429);
    for (const [id, work] of this.jobs) if (work.updated < now - 3_600_000) this.jobs.delete(id);
    for (const [id, times] of this.requests)
      if (times.every((time) => time < now - 3_600_000)) this.requests.delete(id);
    const id = randomUUID();
    const job: PublicJob = { id, topicId, stage: 'queued', episodeId: null, message: null };
    this.jobs.set(id, { job, users: new Set([userId]), updated: now });
    this.reservations.push(now);
    return { kind: 'job', job: { ...job } };
  }
  async enqueue(id: string) {
    const work = this.jobs.get(id);
    if (!work || work.job.stage !== 'queued') return;
    work.job.stage = 'processing';
    work.updated = this.clock();
    // Não aguardar o processamento no handler HTTP.
    void Promise.resolve()
      .then(() =>
        this.process(work.job.topicId, id, async () => {
          work.updated = this.clock();
        }),
      )
      .then(async (rendered) => {
        await verifyRenderedAudio(rendered, new Date(this.clock()));
        if (work.job.stage !== 'processing' || work.updated < this.clock() - 600_000)
          throw new Error();
        work.rendered = rendered;
        work.updated = this.clock();
        work.job = { ...work.job, stage: 'ready', episodeId: id };
      })
      .catch((error: unknown) => {
        work.updated = this.clock();
        work.job = {
          ...work.job,
          stage: 'failed',
          message:
            error instanceof GeminiQuotaFault
              ? generationMessages.free_quota
              : error instanceof InsufficientNewsFault
                ? generationMessages.insufficient_news
                : generationMessages.failed,
        };
      });
  }
  async job(userId: string, id: string): Promise<PublicJob | null> {
    const work = this.jobs.get(id);
    if (!work || !work.users.has(userId)) return null;
    if (['queued', 'processing'].includes(work.job.stage) && work.updated < this.clock() - 600_000)
      work.job = {
        ...work.job,
        stage: 'failed',
        message: 'A preparação demorou mais que o esperado. Tente novamente.',
      };
    return { ...work.job };
  }
  async episode(id: string): Promise<PublicEpisode | null> {
    const work = this.jobs.get(id),
      rendered = work?.rendered;
    if (
      !work ||
      work.job.stage !== 'ready' ||
      !rendered ||
      Date.parse(rendered.expiresAt) <= this.clock()
    )
      return null;
    const used = new Set(
      rendered.approved.script.claims.flatMap((claim) =>
        claim.evidence.map((item) => item.articleId),
      ),
    );
    const sources = rendered.approved.context.articles.filter((article) => used.has(article.id));
    if (sources.some((item) => Date.parse(item.publishedAt) < this.clock() - 72 * 3_600_000))
      return null;
    return {
      id,
      topicId: work.job.topicId,
      title: rendered.approved.script.title,
      generatedAt: rendered.generatedAt,
      expiresAt: rendered.expiresAt,
      durationSeconds: rendered.audio.metrics.duration,
      sources: sources.map(({ publisher, title, url, publishedAt }) => ({
        publisher,
        title,
        url,
        publishedAt,
      })),
    };
  }
  async audio(id: string) {
    if (!(await this.episode(id))) return null;
    const work = this.jobs.get(id)!;
    const expiresIn = Math.min(
      300,
      Math.floor((Date.parse(work.rendered!.expiresAt) - this.clock()) / 1000),
    );
    if (expiresIn < 1) return null;
    return this.issueAudio(
      await verifyRenderedAudio(work.rendered!, new Date(this.clock())),
      expiresIn,
    );
  }
}
