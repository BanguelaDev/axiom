import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';
import type { EpisodeFeedback } from '../core/src/feedback.ts';
import { ApiFault } from '../core/src/api.ts';

/** Banco privado da instalação local. Nunca é servido pelo handler HTTP. */
export class LocalStore {
  private db: DatabaseSync;
  private revision = 0;
  private closed = false;
  constructor(path = ':memory:') {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path);
    try {
      this.db.exec('PRAGMA busy_timeout=3000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;');
      const version = this.db.prepare('PRAGMA user_version').get()?.user_version;
      if (typeof version !== 'number' || version > 1) throw new Error();
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS local_state (
          id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL,
          payload TEXT NOT NULL CHECK(json_valid(payload))
        ) STRICT;
        CREATE TABLE IF NOT EXISTS local_sessions (
          token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires INTEGER NOT NULL
        ) STRICT;
        CREATE INDEX IF NOT EXISTS local_sessions_expiry ON local_sessions(expires);
        CREATE TABLE IF NOT EXISTS local_withdrawals (
          episode_id TEXT PRIMARY KEY, created INTEGER NOT NULL
        ) STRICT;
        CREATE TABLE IF NOT EXISTS local_publications (
          url_hash TEXT PRIMARY KEY, published INTEGER NOT NULL, last_seen INTEGER NOT NULL
        ) STRICT;
        CREATE TABLE IF NOT EXISTS local_feedback (
          id TEXT PRIMARY KEY, episode_id TEXT NOT NULL, session_hash TEXT NOT NULL,
          kind TEXT NOT NULL, clarity INTEGER, naturalness INTEGER, created INTEGER NOT NULL
        ) STRICT;
        CREATE TABLE IF NOT EXISTS local_events (
          id INTEGER PRIMARY KEY, kind TEXT NOT NULL, payload TEXT NOT NULL CHECK(json_valid(payload)), created INTEGER NOT NULL
        ) STRICT;
        PRAGMA user_version=1;
      `);
      if (path !== ':memory:') chmodSync(path, 0o600);
    } catch {
      this.db.close();
      throw new Error(
        'Não foi possível abrir o banco local. Preserve os arquivos de work/data para recuperação.',
      );
    }
  }
  load(): unknown {
    const row = this.db.prepare('SELECT revision, payload FROM local_state WHERE id=1').get();
    if (!row) return null;
    if (
      typeof row.revision !== 'number' ||
      typeof row.payload !== 'string' ||
      row.payload.length > 10 * 1024 * 1024
    )
      throw new Error('Estado local incompatível. Preserve o banco antes de tentar recuperar.');
    this.revision = row.revision;
    return JSON.parse(row.payload);
  }
  save(value: unknown): void {
    const payload = JSON.stringify(value);
    if (payload.length > 10 * 1024 * 1024) throw new Error('O estado local excedeu o limite.');
    const result =
      this.revision === 0
        ? this.db
            .prepare(
              'INSERT INTO local_state(id,revision,payload) VALUES(1,1,?) ON CONFLICT DO NOTHING',
            )
            .run(payload)
        : this.db
            .prepare(
              'UPDATE local_state SET revision=revision+1,payload=? WHERE id=1 AND revision=?',
            )
            .run(payload, this.revision);
    if (result.changes !== 1)
      throw new Error(
        'O banco local foi alterado por outro processo. Reinicie uma única instância do servidor.',
      );
    this.revision++;
  }
  session(token: string, now = Date.now()): string | null {
    if (!/^[a-f0-9]{64}$/.test(token)) return null;
    const row = this.db
      .prepare('SELECT user_id FROM local_sessions WHERE token_hash=? AND expires>?')
      .get(createHash('sha256').update(token).digest('hex'), now);
    return typeof row?.user_id === 'string' ? row.user_id : null;
  }
  issueSession(now = Date.now()) {
    this.db.prepare('DELETE FROM local_sessions WHERE expires<=?').run(now);
    const count = this.db.prepare('SELECT count(*) AS n FROM local_sessions').get()?.n;
    if (typeof count !== 'number' || count >= 64) return null;
    const token = randomBytes(32).toString('hex');
    this.db
      .prepare('INSERT INTO local_sessions(token_hash,user_id,expires) VALUES(?,?,?)')
      .run(createHash('sha256').update(token).digest('hex'), randomUUID(), now + 3_600_000);
    return { accessToken: token, expiresIn: 3600 };
  }
  firstPublication(url: string, published: string, now = Date.now()): string {
    const time = Date.parse(published);
    if (!Number.isFinite(time)) throw new Error('Data inválida.');
    const hash = createHash('sha256').update(url).digest('hex');
    this.db
      .prepare(
        `INSERT INTO local_publications(url_hash,published,last_seen) VALUES(?,?,?)
      ON CONFLICT(url_hash) DO UPDATE SET published=min(published,excluded.published),last_seen=excluded.last_seen`,
      )
      .run(hash, time, now);
    return new Date(
      this.db.prepare('SELECT published FROM local_publications WHERE url_hash=?').get(hash)!
        .published as number,
    ).toISOString();
  }
  isWithdrawn(id: string): boolean {
    return !!this.db.prepare('SELECT 1 FROM local_withdrawals WHERE episode_id=?').get(id);
  }
  withdraw(id: string, now = Date.now()) {
    this.db
      .prepare(
        'INSERT INTO local_withdrawals(episode_id,created) VALUES(?,?) ON CONFLICT DO NOTHING',
      )
      .run(id, now);
  }
  feedback(userId: string, episodeId: string, value: EpisodeFeedback, now = Date.now()) {
    const hash = createHash('sha256').update(userId).digest('hex');
    const count = this.db
      .prepare('SELECT count(*) AS n FROM local_feedback WHERE created>?')
      .get(now - 86_400_000)!.n as number;
    if (count >= 1000) throw new ApiFault('rate_limited', 429);
    const repeated = this.db
      .prepare(
        'SELECT 1 FROM local_feedback WHERE session_hash=? AND episode_id=? AND kind=? AND created>?',
      )
      .get(hash, episodeId, value.kind, now - 86_400_000);
    if (repeated) return;
    const personal = this.db
      .prepare('SELECT count(*) AS n FROM local_feedback WHERE session_hash=? AND created>?')
      .get(hash, now - 86_400_000)!.n as number;
    if (personal >= 20) throw new ApiFault('rate_limited', 429);
    this.db
      .prepare(
        'INSERT INTO local_feedback(id,episode_id,session_hash,kind,clarity,naturalness,created) VALUES(?,?,?,?,?,?,?)',
      )
      .run(
        randomUUID(),
        episodeId,
        hash,
        value.kind,
        value.clarity ?? null,
        value.naturalness ?? null,
        now,
      );
  }
  event(
    kind:
      | 'request'
      | 'generation-start'
      | 'phase'
      | 'generation-ready'
      | 'generation-failed'
      | 'audio-access'
      | 'provider-usage'
      | 'narration',
    data: Record<string, string | number | null>,
    now = Date.now(),
  ) {
    this.db
      .prepare('INSERT INTO local_events(kind,payload,created) VALUES(?,?,?)')
      .run(kind, JSON.stringify(data), now);
  }
  report() {
    return {
      events: this.db
        .prepare('SELECT kind,payload,created FROM local_events ORDER BY id DESC LIMIT 2000')
        .all()
        .map((row) => ({ ...row, payload: JSON.parse(row.payload as string) })),
      feedback: this.db
        .prepare(
          'SELECT episode_id,kind,count(*) AS count,avg(clarity) AS clarity,avg(naturalness) AS naturalness FROM local_feedback GROUP BY episode_id,kind',
        )
        .all(),
      withdrawals: this.db.prepare('SELECT episode_id,created FROM local_withdrawals').all(),
      billing:
        'Exige projeto Gemini Free Tier sem faturamento; valores financeiros não são inferidos das métricas.',
    };
  }
  prune(now = Date.now()) {
    this.db.prepare('DELETE FROM local_sessions WHERE expires<=?').run(now);
    this.db.prepare('DELETE FROM local_feedback WHERE created<?').run(now - 30 * 86_400_000);
    this.db.prepare('DELETE FROM local_events WHERE created<?').run(now - 90 * 86_400_000);
    this.db.prepare('DELETE FROM local_withdrawals WHERE created<?').run(now - 90 * 86_400_000);
    this.db.prepare('DELETE FROM local_publications WHERE last_seen<?').run(now - 180 * 86_400_000);
  }
  close() {
    if (!this.closed) {
      this.closed = true;
      this.db.close();
    }
  }
}
