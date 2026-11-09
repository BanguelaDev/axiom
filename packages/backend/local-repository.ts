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
import { assertApprovedEditorial } from '../pipeline/editorial.ts';
import { assertAudioQuality } from '../pipeline/audio.ts';
import { parseJob } from '../core/src/podcast.ts';
import type { LocalStore } from './local-store.ts';

type Work = { job: PublicJob; users: Set<string>; updated: number; rendered?: RenderedEpisode };
export type Processor = (
  topic: TopicId,
  jobId: string,
  onPhase: (phase: string) => Promise<void>,
) => Promise<RenderedEpisode>;
/** Fila local com persistência opcional; não emula infraestrutura remota. */
export class LocalRepository implements BackendRepository {
  private jobs = new Map<string, Work>();
  private requests = new Map<string, number[]>();
  private reservations: number[] = [];
  private closed = false;
  constructor(
    private readonly process: Processor,
    private readonly issueAudio: (
      bytes: Uint8Array,
      expiresIn: number,
      episodeId: string,
    ) => { url: string; expiresIn: number },
    private readonly clock = () => Date.now(),
    private readonly store?: Pick<LocalStore, 'load' | 'save'> &
      Partial<Pick<LocalStore, 'isWithdrawn' | 'event'>>,
  ) {
    const raw = store?.load();
    if (raw == null) return;
    try {
      const value = raw as {
        version: number;
        jobs: { job: PublicJob; users: string[]; updated: number; rendered?: RenderedEpisode }[];
        requests: [string, number[]][];
        reservations: number[];
      };
      if (
        value.version !== 1 ||
        !Array.isArray(value.jobs) ||
        value.jobs.length > 300 ||
        !Array.isArray(value.requests) ||
        value.requests.length > 256 ||
        !Array.isArray(value.reservations)
      )
        throw new Error();
      const validTimes = (times: number[]) =>
        Array.isArray(times) &&
        times.length <= 100 &&
        times.every((time) => Number.isFinite(time) && time <= this.clock());
      if (!validTimes(value.reservations)) throw new Error();
      this.reservations = value.reservations.filter((time) => time > this.clock() - 3_600_000);
      for (const [id, times] of value.requests) {
        if (typeof id !== 'string' || id.length > 100 || !validTimes(times)) throw new Error();
        this.requests.set(
          id,
          times.filter((time) => time > this.clock() - 3_600_000),
        );
      }
      for (const item of value.jobs) {
        const job = parseJob(item.job);
        if (
          !Array.isArray(item.users) ||
          item.users.length > 64 ||
          item.users.some((user) => typeof user !== 'string' || user.length > 100) ||
          !Number.isFinite(item.updated) ||
          item.updated > this.clock()
        )
          throw new Error();
        if (item.updated < this.clock() - 24 * 3_600_000) continue;
        if (['queued', 'processing'].includes(job.stage)) {
          job.stage = 'failed';
          job.message = generationMessages.interrupted;
        }
        if (job.stage === 'ready') {
          const rendered = item.rendered;
          if (
            !rendered ||
            typeof rendered.file !== 'string' ||
            !Number.isFinite(Date.parse(rendered.generatedAt)) ||
            !Number.isFinite(Date.parse(rendered.expiresAt))
          )
            throw new Error();
          assertApprovedEditorial(rendered.approved, new Date(rendered.generatedAt));
          assertAudioQuality(rendered.audio.metrics, true);
        }
        this.jobs.set(job.id, { ...item, job, users: new Set(item.users) });
      }
      this.persist();
    } catch {
      throw new Error(
        'Os registros locais não puderam ser recuperados. Preserve o banco para análise; nenhuma geração foi iniciada.',
      );
    }
  }
  private persist() {
    if (!this.closed)
      this.store?.save({
        version: 1,
        jobs: [...this.jobs.values()].map((work) => ({ ...work, users: [...work.users] })),
        requests: [...this.requests],
        reservations: this.reservations,
      });
  }
  close() {
    for (const work of this.jobs.values())
      if (['queued', 'processing'].includes(work.job.stage)) {
        work.job = { ...work.job, stage: 'failed', message: generationMessages.interrupted };
        work.updated = this.clock();
      }
    this.persist();
    this.closed = true;
  }
  async request(userId: string, topicId: TopicId): Promise<GenerationResult> {
    if (this.closed) throw new ApiFault('temporarily_unavailable', 503);
    const now = this.clock();
    const usage = (this.requests.get(userId) || []).filter((time) => time > now - 3_600_000);
    if (usage.length >= 12 || usage.filter((time) => time > now - 60_000).length >= 6)
      throw new ApiFault('rate_limited', 429);
    usage.push(now);
    this.requests.set(userId, usage);
    for (const [id, work] of this.jobs) {
      if (work.job.topicId !== topicId) continue;
      if (work.job.stage === 'ready') {
        const episode = this.currentEpisode(id);
        if (episode) {
          this.store?.event?.('request', { topicId, kind: 'reused', episodeId: id });
          this.persist();
          return { kind: 'episode', episode };
        }
      }
      if (['queued', 'processing'].includes(work.job.stage) && work.updated > now - 600_000) {
        this.store?.event?.('request', { topicId, kind: 'shared', episodeId: id });
        work.users.add(userId);
        this.persist();
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
    this.store?.event?.('request', { topicId, kind: 'new', episodeId: id });
    this.persist();
    return { kind: 'job', job: { ...job } };
  }
  async enqueue(id: string) {
    const work = this.jobs.get(id);
    if (this.closed || !work || work.job.stage !== 'queued') return;
    work.job.stage = 'processing';
    work.updated = this.clock();
    this.persist();
    // Não aguardar o processamento no handler HTTP.
    void Promise.resolve()
      .then(() =>
        this.process(work.job.topicId, id, async () => {
          if (this.closed) throw new Error('Servidor encerrado.');
          work.updated = this.clock();
          this.persist();
        }),
      )
      .then(async (rendered) => {
        if (this.closed) return;
        await verifyRenderedAudio(rendered, new Date(this.clock()));
        if (work.job.stage !== 'processing' || work.updated < this.clock() - 600_000)
          throw new Error();
        work.rendered = rendered;
        work.updated = this.clock();
        work.job = { ...work.job, stage: 'ready', episodeId: id };
        this.persist();
      })
      .catch((error: unknown) => {
        if (this.closed) return;
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
        try {
          this.persist();
        } catch {
          this.closed = true;
          console.error('[AXIOM] armazenamento_local_indisponivel');
        }
      });
  }
  async job(userId: string, id: string): Promise<PublicJob | null> {
    const work = this.jobs.get(id);
    if (!work || !work.users.has(userId)) return null;
    if (
      ['queued', 'processing'].includes(work.job.stage) &&
      work.updated < this.clock() - 600_000
    ) {
      work.job = {
        ...work.job,
        stage: 'failed',
        message: 'A preparação demorou mais que o esperado. Tente novamente.',
      };
      this.persist();
    }
    return { ...work.job };
  }
  async episode(id: string): Promise<PublicEpisode | null> {
    return this.currentEpisode(id);
  }
  private currentEpisode(id: string): PublicEpisode | null {
    if (this.closed) return null;
    const work = this.jobs.get(id),
      rendered = work?.rendered;
    if (
      !work ||
      this.store?.isWithdrawn?.(id) ||
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
    const bytes = await verifyRenderedAudio(work.rendered!, new Date(this.clock()));
    if (!this.currentEpisode(id)) return null;
    return this.issueAudio(bytes, expiresIn, id);
  }
}
