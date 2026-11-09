import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { once } from 'node:events';
import { LocalStore } from '../packages/backend/local-store.ts';
import { LocalRepository } from '../packages/backend/local-repository.ts';
import { startLocalApi } from '../packages/backend/local-server.ts';
import { ApiFault, generationMessages } from '../packages/core/src/api.ts';

async function temporary(run: (path: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'axiom-store-'));
  try {
    await run(join(directory, 'state.sqlite'));
  } finally {
    const target = resolve(directory);
    if (dirname(target) !== resolve(tmpdir()) || !basename(target).startsWith('axiom-store-'))
      throw new Error('Destino inesperado.');
    await rm(target, { recursive: true, force: true });
  }
}
test('sessão persiste após reiniciar, expira e o banco não contém o token original', async () =>
  temporary(async (path) => {
    const now = Date.now();
    let store = new LocalStore(path);
    const session = store.issueSession(now)!;
    const user = store.session(session.accessToken, now)!;
    store.close();
    store = new LocalStore(path);
    try {
      assert.equal(store.session(session.accessToken, now + 1000), user);
      assert.equal(store.session(session.accessToken, now + 3_600_000), null);
      assert.equal(store.session('forged', now), null);
    } finally {
      store.close();
    }
    assert.equal((await readFile(path)).includes(Buffer.from(session.accessToken)), false);
  }));
test('reinício preserva associação e cota sem repetir geração interrompida', async () =>
  temporary(async (path) => {
    const now = Date.now();
    let calls = 0;
    let store = new LocalStore(path);
    const processor = async () => {
      calls++;
      throw new Error('Não deve executar.');
    };
    let repository = new LocalRepository(
      processor,
      () => ({ url: 'https://example.com', expiresIn: 300 }),
      () => now,
      store,
    );
    const first = await repository.request('user-one', 'ai');
    if (first.kind !== 'job') throw new Error();
    for (let i = 0; i < 5; i++) await repository.request('user-one', 'ai');
    repository.close();
    store.close();
    store = new LocalStore(path);
    try {
      repository = new LocalRepository(
        processor,
        () => ({ url: 'https://example.com', expiresIn: 300 }),
        () => now,
        store,
      );
      assert.equal(
        (await repository.job('user-one', first.job.id))?.message,
        generationMessages.interrupted,
      );
      assert.equal(await repository.job('other', first.job.id), null);
      await assert.rejects(
        repository.request('user-one', 'ai'),
        (error) => error instanceof ApiFault && error.code === 'rate_limited',
      );
      assert.equal(calls, 0);
      repository.close();
    } finally {
      store.close();
    }
  }));
test('dados incompatíveis e gravação concorrente não substituem silenciosamente o estado', async () =>
  temporary(async (path) => {
    const a = new LocalStore(path),
      b = new LocalStore(path);
    try {
      assert.equal(a.load(), null);
      assert.equal(b.load(), null);
      a.save({ version: 99 });
      assert.throws(() => b.save({ version: 1 }));
      assert.throws(
        () =>
          new LocalRepository(
            async () => {
              throw new Error();
            },
            () => ({ url: 'https://example.com', expiresIn: 300 }),
            () => Date.now(),
            a,
          ),
        /recuperados/,
      );
    } finally {
      a.close();
      b.close();
    }
  }));
test('API preserva sessão e pedido após encerramento e não inicia fornecedores ao recuperar', async () =>
  temporary(async (path) => {
    let calls = 0;
    const options = {
      statePath: path,
      generation: true,
      processor: async () => {
        calls++;
        return new Promise<never>(() => {});
      },
    };
    let server = await startLocalApi(0, options);
    let address = server.address();
    if (!address || typeof address === 'string') throw new Error();
    const url = `http://127.0.0.1:${address.port}`;
    const session = await (await fetch(`${url}/dev/session`, { method: 'POST' })).json();
    const headers = {
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json',
    };
    const result = await (
      await fetch(`${url}/generations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ topicId: 'ai' }),
      })
    ).json();
    server.close();
    await once(server, 'close');
    server = await startLocalApi(0, options);
    try {
      address = server.address();
      if (!address || typeof address === 'string') throw new Error();
      const response = await fetch(
        `http://127.0.0.1:${address.port}/generations/${result.job.id}`,
        { headers },
      );
      assert.equal(response.status, 200);
      assert.equal((await response.json()).job.message, generationMessages.interrupted);
      assert.equal(calls, 1);
    } finally {
      server.close();
      await once(server, 'close');
    }
  }));
