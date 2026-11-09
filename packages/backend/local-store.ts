import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';

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
  close() {
    if (!this.closed) {
      this.closed = true;
      this.db.close();
    }
  }
}
