import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPrivateIPv4, lanAddress } from '../packages/backend/lan-address.ts';
test('conexão LAN aceita IPv4 privado e recusa destinos públicos ou valores ambíguos', () => {
  for (const host of ['192.168.1.254', '10.0.2.2', '172.16.0.1', '172.31.255.254'])
    assert.ok(isPrivateIPv4(host));
  for (const host of [
    '127.0.0.1',
    '8.8.8.8',
    '172.32.0.1',
    '192.168.1.999',
    'user@192.168.1.1',
    'https://192.168.1.1',
  ])
    assert.equal(isPrivateIPv4(host), false);
  assert.equal(lanAddress('192.168.1.254'), '192.168.1.254');
  assert.throws(() => lanAddress('8.8.8.8'));
});
