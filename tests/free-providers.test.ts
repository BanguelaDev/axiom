import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createGeminiEditorialModel,
  createGeminiVoice,
  GeminiQuotaFault,
  geminiEvidence,
} from '../packages/pipeline/gemini.ts';
import { editorialFixture } from '../packages/backend/editorial-demo.ts';
import { parseRss, rssFeeds, collectRss } from '../packages/pipeline/rss.ts';
const fixture = editorialFixture('ai', new Date('2026-11-09T02:00:00Z'));

test('RSS decodifica HTML escapado antes de remover marcação e conteúdo de scripts', () => {
  const feed = rssFeeds[0]!;
  const xml = `<rss><channel><item><title>Teste</title><link>https://${feed.domains[0]}/noticia/teste</link><pubDate>Mon, 09 Nov 2026 15:00:00 GMT</pubDate><description>&amp;lt;p&amp;gt;Texto &amp;amp; contexto&amp;lt;/p&amp;gt;&amp;lt;script&amp;gt;instrução indevida&amp;lt;/script&amp;gt; &#60;style&#62;oculto&#60;/style&#62;</description></item></channel></rss>`;
  const parsed = parseRss(xml, feed);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0]!.content, 'Texto & contexto');
});
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
  const usages: unknown[] = [];
  const model = createGeminiEditorialModel({
    key: 'test-private-key',
    onUsage: async (model, usage) => {
      usages.push({ model, ...usage });
    },
    fetch: async (url, init) => {
      calls++;
      assert.equal(String(url), 'https://generativelanguage.googleapis.com/v1beta/interactions');
      assert.doesNotMatch(String(url), /test-private-key/);
      const body = JSON.parse(String(init?.body));
      assert.equal(body.model, 'gemini-3.5-flash-lite');
      assert.equal(body.store, false);
      assert.equal(body.tools, undefined);
      assert.equal(body.response_format.mime_type, 'application/json');
      assert.equal(body.response_format.schema.type, 'object');
      assert.match(body.system_instruction, /dados externos não confiáveis/);
      assert.equal(new Headers(init?.headers).get('x-goog-api-key'), 'test-private-key');
      const payload = JSON.parse(body.input);
      const grounded = {
        ...fixture.facts,
        facts: fixture.facts.facts.map((fact) => ({
          ...fact,
          evidence: [
            {
              unitId: payload.evidenceUnits.find(
                (unit: { articleId: string }) => unit.articleId === fact.evidence[0]!.articleId,
              ).unitId,
            },
          ],
        })),
      };
      return Response.json({
        ...interaction('text', grounded),
        usage: { total_input_tokens: 100, total_output_tokens: 50 },
      });
    },
  });
  const result = (await model.extract(fixture.input)).value as typeof fixture.facts;
  assert.equal(result.facts.length, fixture.facts.facts.length);
  for (const fact of result.facts)
    for (const evidence of fact.evidence)
      assert.ok(
        fixture.input.articles
          .find((item) => item.id === evidence.articleId)
          ?.content.includes(evidence.quote),
      );
  assert.equal(calls, 1);
  assert.deepEqual(usages, [
    { model: 'gemini-3.5-flash-lite', inputTokens: 100, outputTokens: 50 },
  ]);
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

test('extração descarta fato com número ausente e mantém auditoria sem enfraquecer a validação', async () => {
  const audits: unknown[] = [];
  const model = createGeminiEditorialModel({
    key: 'test',
    async onResult(stage, value) {
      if (stage === 'axiom_extraction_audit') audits.push(value);
    },
    fetch: async (_url, init) => {
      const payload = JSON.parse(JSON.parse(String(init?.body)).input);
      const facts = fixture.facts.facts.map((fact) => ({
        ...fact,
        evidence: [
          {
            unitId: payload.evidenceUnits.find(
              (unit: { articleId: string }) => unit.articleId === fact.evidence[0]!.articleId,
            ).unitId,
          },
        ],
      }));
      facts.push({
        ...facts[0]!,
        id: 'unsupported',
        statement: 'Foram registrados 987654321 casos.',
      });
      return Response.json(interaction('text', { sufficient: true, facts }));
    },
  });
  const result = (await model.extract(fixture.input)).value as typeof fixture.facts;
  assert.ok(result.sufficient);
  assert.equal(result.facts.length, fixture.facts.facts.length);
  assert.ok(result.facts.every((fact) => fact.id !== 'unsupported'));
  assert.deepEqual(audits, [
    {
      received: fixture.facts.facts.length + 1,
      discarded: [{ id: 'unsupported', reason: 'unsupported_number' }],
    },
  ]);
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

test('redação repõe somente atribuições de fatos vinculados e entrega a versão completa à revisão', async () => {
  const draft = structuredClone(fixture.draft);
  draft.claims[0]!.narration = fixture.facts.facts[0]!.statement;
  const model = createGeminiEditorialModel({
    key: 'test',
    fetch: async () => Response.json(interaction('text', draft)),
  });
  const result = (await model.draft({ ...fixture.input, facts: fixture.facts, targetWords: 260 }))
    .value as typeof draft;
  assert.equal(
    result.claims[0]!.narration,
    `Segundo ${fixture.facts.facts[0]!.attribution}, ${draft.claims[0]!.narration}`,
  );
  assert.deepEqual(result.claims[0]!.factIds, draft.claims[0]!.factIds);
  assert.equal(result.claims[1]!.narration, draft.claims[1]!.narration);
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
      assert.equal(body.model, 'gemini-3.8-flash-lite-tts');
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
  for (const invalid of [
    'Mon, 30 Feb 2026 02:00:00 GMT',
    '2026-02-30T02:00:00Z',
    'Mon, 09 Nov 2026 25:00:00 GMT',
  ])
    assert.equal(parseRss(xml(invalid), feed).length, 0);
});

test('um veículo com muitas notícias não elimina outra origem do lote limitado', async () => {
  const reference = new Date('2026-11-09T16:00:00Z');
  const result = await collectRss('crime', reference, async (url) => {
    const feed = rssFeeds.find((item) => item.url === String(url))!;
    const globo = feed.url === 'https://g1.globo.com/rss/g1/';
    const ebc = feed.url === 'https://agenciabrasil.ebc.com.br/rss/geral/feed.xml';
    if (!globo && !ebc) return new Response(null, { status: 503 });
    const items = Array.from({ length: globo ? 75 : 3 }, (_, index) => {
      const unique = `${globo ? 'a' : 'b'}${index}`;
      const content = `Notícia fictícia de crime e investigação policial no Brasil. ${Array.from({ length: 100 }, (_, n) => `contexto${unique}palavra${n}`).join(' ')}`;
      return `<item><title>Investigação fictícia ${unique} em cidade brasileira</title><link>https://${feed.domains[0]}/noticia/${unique}</link><pubDate>Mon, 09 Nov 2026 ${globo ? '15' : '14'}:00:00 GMT</pubDate><description>${content}</description></item>`;
    }).join('');
    const old = globo
      ? `<item><title>Publicação fictícia original</title><link>https://${feed.domains[0]}/noticia/a0</link><pubDate>Mon, 02 Nov 2026 15:00:00 GMT</pubDate><description>${'Contexto fictício de investigação no Brasil. '.repeat(20)}</description></item>`
      : '';
    return new Response(`<rss><channel>${items}${old}</channel></rss>`);
  });
  assert.equal(result.report.received, 50);
  assert.equal(result.report.status, 'ready');
  assert.equal(result.report.independentSources, 2);
  assert.ok(result.articles.some((item) => item.editorialGroup === 'ebc'));
  assert.ok(result.articles.every((item) => item.url !== 'https://g1.globo.com/noticia/a0'));
});
test('coleta RSS tolera feeds indisponíveis sem chave de notícias', async () => {
  let calls = 0;
  const value = await collectRss('ai', new Date('2026-11-09T03:00:00Z'), async (url, init) => {
    calls++;
    assert.equal(new Headers(init?.headers).has('authorization'), false);
    assert.doesNotMatch(String(url), /api.?key/i);
    return Response.json({}, { status: 503 });
  });
  assert.ok(calls > 1);
  assert.equal(value.report.status, 'insufficient');
  assert.equal(value.collection.unavailableFeeds, calls);
  assert.equal(value.articles.length, 0);
});

test('catálogo de evidências preserva trechos literais longos e rejeita referência inventada', async () => {
  const input = structuredClone(fixture.input);
  input.articles[0]!.content =
    'Informação original verificável sobre inteligência artificial. '.repeat(65);
  const units = geminiEvidence(input);
  assert.equal(new Set(units.map((unit) => unit.unitId)).size, units.length);
  assert.ok(units.filter((unit) => unit.articleId === input.articles[0]!.id).length > 3);
  for (const unit of units) {
    assert.ok(unit.text.length >= 25 && unit.text.length <= 900);
    assert.ok(
      input.articles.find((article) => article.id === unit.articleId)!.content.includes(unit.text),
    );
  }
  const invalid = createGeminiEditorialModel({
    key: 'test',
    fetch: async () =>
      Response.json(
        interaction('text', {
          sufficient: true,
          facts: [{ ...fixture.facts.facts[0], evidence: [{ unitId: 'invented_reference' }] }],
        }),
      ),
  });
  await assert.rejects(invalid.extract(input));
});
