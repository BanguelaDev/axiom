import test from 'node:test';
import assert from 'node:assert/strict';
import { createElevenLabsVoice } from '../packages/pipeline/elevenlabs.ts';
import { AudioFault } from '../packages/pipeline/audio.ts';

test('voz usa o formato contratado, envia texto somente no corpo e não inclui parâmetro incompatível', async () => {
  const bytes = new Uint8Array([1, 2, 3]);
  const voice = createElevenLabsVoice({
    key: 'test-key',
    voiceId: 'test-voice',
    fetch: async (input, init) => {
      assert.ok(!String(input).includes('test-key'));
      assert.ok(String(input).endsWith('?output_format=mp3_44100_128'));
      assert.equal(new Headers(init?.headers).get('xi-api-key'), 'test-key');
      const body = JSON.parse(String(init?.body));
      assert.equal(body.text, 'Texto fictício de teste.');
      assert.equal(body.model_id, 'eleven_multilingual_v2');
      assert.ok(!('language_code' in body));
      return new Response(bytes, { headers: { 'content-type': 'audio/mpeg' } });
    },
  });
  assert.deepEqual(await voice.synthesize('Texto fictício de teste.'), bytes);
});

test('quota, MIME incorreto, resposta vazia, limite e erro de rede são bloqueados sem repetição ou dados privados', async () => {
  for (const [response, code] of [
    [() => Response.json({ error: 'test-key private script' }, { status: 429 }), 'voice_quota'],
    [() => Response.json({ error: 'private script' }), 'invalid_audio'],
    [
      () => new Response(new Uint8Array(), { headers: { 'content-type': 'audio/mpeg' } }),
      'invalid_audio',
    ],
    [
      () =>
        new Response('body', {
          headers: { 'content-type': 'audio/mpeg', 'content-length': '10485761' },
        }),
      'invalid_audio',
    ],
  ] as const) {
    let calls = 0;
    const voice = createElevenLabsVoice({
      key: 'test-key',
      voiceId: 'test-voice',
      fetch: async () => {
        calls++;
        return response();
      },
    });
    await assert.rejects(
      voice.synthesize('Texto de teste.'),
      (error: unknown) =>
        error instanceof AudioFault &&
        error.code === code &&
        !/test-key|private script/.test(error.message),
    );
    assert.equal(calls, 1);
  }
  const voice = createElevenLabsVoice({
    key: 'test-key',
    voiceId: 'test-voice',
    fetch: async () => {
      throw new Error('test-key private URL');
    },
  });
  await assert.rejects(
    voice.synthesize('Texto de teste.'),
    (error: unknown) => error instanceof AudioFault && error.code === 'voice_unavailable',
  );
});
