import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createGeminiEditorialModel,
  createGeminiVoice,
  GeminiQuotaFault,
} from '../packages/pipeline/gemini.ts';
import { editorialFixture } from '../packages/backend/editorial-demo.ts';
import { parseRss, rssFeeds, collectRss } from '../packages/pipeline/rss.ts';
const fixture = editorialFixture('ai', new Date('2026-11-09T02:00:00Z'));
const interaction = (type: string, value: unknown) => ({
  status: 'completed',
  steps: [
    {
      type: 'model_output',
      content: [
        type === 'text'
          ? { type, text: JSON.stringify(value) }
          : { type, mime_type: 'audio/wav', data: value },
      ],
    },
  ],
});
test('Gemini usa saída estruturada, chave em header e modo sem estado, sem chamadas a fornecedor pago', async () => {
  let calls = 0;
  const model = createGeminiEditorialModel({
    key: 'test-private-key',
    fetch: async (url, init) => {
      calls++;
      assert.equal(String(url), 'https://generativelanguage.googleapis.com/v1beta/interactions');
      assert.doesNotMatch(String(url), /test-private-key/);
      const body = JSON.parse(String(init?.body));
      assert.equal(body.model, 'gemini-3.8-flash');
      assert.equal(body.store, false);
      assert.equal(body.tools, undefined);
      assert.equal(body.response_format.mime_type, 'application/json');
      assert.equal(body.response_format.schema.type, 'object');
      assert.match(body.system_instruction, /dados externos não confiáveis/);
      assert.equal(new Headers(init?.headers).get('x-goog-api-key'), 'test-private-key');
      return Response.json(interaction('text', fixture.facts));
    },
  });
  assert.deepEqual((await model.extract(fixture.input)).value, fixture.facts);
  assert.equal(calls, 1);
});
test('cota gratuita interrompe a IA sem repetir ou migrar para um fornecedor pago', async () => {
  let calls = 0;
  const model = createGeminiEditorialModel({
    key: 'test',
    fetch: async () => {
      calls++;
      return Response.json({ error: 'private context' }, { status: 429 });
    },
  });
  await assert.rejects(
    model.extract(fixture.input),
    (error) => error instanceof GeminiQuotaFault && !error.message.includes('private context'),
  );
  assert.equal(calls, 1);
});
test('resposta incompleta ou estrutura inválida do Gemini não libera roteiro', async () => {
  for (const response of [
    { status: 'in_progress', steps: [] },
    interaction('text', { unexpected: 'private content' }),
  ]) {
    const model = createGeminiEditorialModel({
      key: 'test',
      fetch: async () => Response.json(response),
    });
    await assert.rejects(
      model.extract(fixture.input),
      (error) => error instanceof Error && !error.message.includes('private content'),
    );
  }
});
test('voz Gemini solicita WAV e recitação literal; bytes inválidos são rejeitados', async () => {
  const wave = Buffer.alloc(50);
  wave.write('RIFF');
  wave.write('WAVE', 8);
  let calls = 0;
  const voice = createGeminiVoice({
    key: 'test',
    fetch: async (_url, init) => {
      calls++;
      const body = JSON.parse(String(init?.body));
      assert.equal(body.model, 'gemini-3.8-flash-tts');
      assert.equal(body.response_format.mime_type, 'audio/wav');
      assert.equal(body.store, false);
      assert.equal(body.input[0].content[0].text, 'Texto para narrar.');
      return Response.json(interaction('audio', wave.toString('base64')));
    },
  });
  assert.deepEqual(await voice.synthesize('Texto para narrar.'), wave);
  assert.equal(calls, 1);
  const invalid = createGeminiVoice({
    key: 'test',
    fetch: async () =>
      Response.json(interaction('audio', Buffer.from('not audio').toString('base64'))),
  });
  await assert.rejects(invalid.synthesize('Texto.'), /áudio/i);
});
test('RSS rejeita entidades, links fora da fonte, ausência de publicação e conteúdo executável', () => {
  const feed = rssFeeds.find((item) => item.group === 'guardian')!;
  const xml = (date: string, link = 'https://www.theguardian.com/example') =>
    `<rss><channel><item><title>Artificial intelligence</title><link>${link}</link><pubDate>${date}</pubDate><description><![CDATA[<script>PRIVATE_SCRIPT</script><p>Resumo &amp; contexto sobre inteligência artificial.</p>]]></description></item></channel></rss>`;
  const result = parseRss(xml('Mon, 09 Nov 2026 02:00:00 GMT'), feed);
  assert.equal(result.length, 1);
  assert.match(result[0]!.content, /Resumo & contexto/);
  assert.doesNotMatch(result[0]!.content, /PRIVATE_SCRIPT|<script/);
  assert.equal(parseRss(xml('', 'https://www.theguardian.com/a'), feed).length, 0);
  assert.equal(
    parseRss(xml('Mon, 09 Nov 2026 02:00:00 GMT', 'https://untrusted.example/a'), feed).length,
    0,
  );
  assert.throws(() => parseRss('<!DOCTYPE rss [<!ENTITY a "x">]><rss/>', feed));
});
test('coleta RSS limita o lote e tolera feeds indisponíveis sem chave de notícias', async () => {
  let calls = 0;
  const value = await collectRss('ai', new Date('2026-11-09T03:00:00Z'), async (url, init) => {
    calls++;
    assert.equal(new Headers(init?.headers).has('authorization'), false);
    assert.doesNotMatch(String(url), /api.?key/i);
    const feed = rssFeeds.find((item) => item.url === String(url))!;
    const items = Array.from(
      { length: 70 },
      (_, index) =>
        `<item><title>Artificial intelligence report ${index}</title><link>https://${feed.domains[0]}/news/${index}</link><pubDate>Mon, 09 Nov 2026 02:00:00 GMT</pubDate><description>${'Inteligência artificial com detalhes e contexto. '.repeat(15)} ${index}</description></item>`,
    ).join('');
    return Response.json({}, { status: 503 });
  });
  assert.ok(calls > 1);
  assert.equal(value.report.status, 'insufficient');
  assert.equal(value.collection.unavailableFeeds, calls);
  assert.equal(value.articles.length, 0);
});
