import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLocalServerUrl as normalize } from '../packages/core/src/server-config.ts';

test('conexão no aparelho normaliza IPv4 privado e exige um servidor na rede local', () => {
  assert.equal(normalize(' 192.168.1.254 '), 'http://192.168.1.254:8787');
  assert.equal(normalize('http://10.0.2.2:8787/'), 'http://10.0.2.2:8787');
  assert.equal(normalize('https://172.31.0.1:9000'), 'https://172.31.0.1:9000');
  assert.equal(normalize('localhost:8787', true), 'http://localhost:8787');
  for (const value of [
    'https://example.org',
    'http://8.8.8.8',
    '127.0.0.1',
    'http://192.168.1.2:0',
    'http://192.168.1.1/api',
    'http://user:password@192.168.1.1',
    'http://192.168.1.1?key=x',
    'http://192.168.1.1#x',
    'ftp://192.168.1.1',
    '172.32.1.1',
    '192.168.1.999',
  ])
    assert.throws(() => normalize(value), Error, value);
});
