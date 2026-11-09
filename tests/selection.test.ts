import test from 'node:test';
import assert from 'node:assert/strict';
import { topics } from '../packages/core/src/topics.ts';
import {
  canonicalUrl,
  isRecent,
  publicationTime,
  independentSourceCount,
} from '../packages/core/src/news.ts';
import { selectionFixture, createSelectionDemo } from '../packages/backend/selection-demo.ts';
import { matchesTopic, newsQueries } from '../packages/pipeline/news-policy.ts';
import { selectNews } from '../packages/pipeline/selection.ts';

const now = new Date('2026-11-08T12:00:00Z');
test('recortes incluem bem-estar digital e contexto brasileiro sem depender da palavra Brasil', () => {
  assert.equal(
    matchesTopic('mental-health', 'Instagram e solidão', 'Pesquisa sobre o bem-estar de usuários.'),
    true,
  );
  assert.equal(
    matchesTopic('mental-health', 'YouTube lança recurso', 'Novas opções de vídeo para criadores.'),
    false,
  );
  assert.equal(
    matchesTopic(
      'crime',
      'Polícia Federal investiga homicídio',
      'Investigação em andamento no Distrito Federal.',
    ),
    true,
  );
  assert.equal(
    matchesTopic(
      'crime',
      'Discussão sobre responsabilidade fiscal',
      'Governo em Brasília discute orçamento. '.repeat(40) +
        ' Caso de prisão antigo é citado ao final.',
    ),
    false,
  );
  assert.equal(
    matchesTopic(
      'fraud',
      'Governo prorroga auxílio',
      'Notícia sobre política pública. '.repeat(45) + ' Atenção a golpes.',
    ),
    false,
  );
});
test('IA exige menção no título ou abertura e rejeita referência distante ao setor', () => {
  assert.equal(matchesTopic('ai', 'Novo chatbot chega ao mercado', 'Contexto da pesquisa.'), true);
  assert.equal(
    matchesTopic('ai', 'Aplicações na educação', 'Pesquisa sobre inteligência artificial.'),
    true,
  );
  assert.equal(
    matchesTopic(
      'ai',
      'Investigação sobre executivo',
      'Contexto de investigação. '.repeat(40) + ' A empresa atua em inteligência artificial.',
    ),
    false,
  );
});
test('publicação exige data possível, horário e fuso, incluindo os limites das 72 horas', () => {
  for (const value of [
    '2026-11-08',
    '2026-11-08T10:00:00',
    '2026-02-30T12:00:00Z',
    '2026-11-08T25:00:00Z',
    '2026-11-08T10:00:00+14:30',
  ])
    assert.ok(Number.isNaN(publicationTime(value)), value);
  assert.equal(isRecent('2026-11-05T08:00:00-04:00', now), true);
  assert.equal(isRecent('2026-11-05T11:59:59.999Z', now), false);
  assert.equal(isRecent('2026-11-08T12:00:00.001Z', now), false);
  assert.equal(
    canonicalUrl('https://news.example/story/?UTM_source=x&section=world/#fragment'),
    'https://news.example/story?section=world%2F',
  );
  assert.throws(() => canonicalUrl('https://user:password@news.example/story'), /inválida/);
});
for (const topic of topics)
  test(`seleção auditável em ${topic.name} sem notícias reais`, () => {
    const { report, simulated } = createSelectionDemo(topic.id, now);
    assert.equal(simulated, true);
    assert.equal(report.status, 'ready');
    assert.equal(report.received, 9);
    assert.equal(report.selected, 3);
    assert.equal(report.independentSources, 3);
    assert.equal(report.decisions.filter((item) => item.reason === 'duplicate').length, 1);
    assert.equal(report.decisions.filter((item) => item.reason === 'outside_window').length, 1);
    assert.equal(report.decisions.filter((item) => item.reason === 'future_date').length, 1);
    assert.equal(report.decisions.filter((item) => item.reason === 'off_topic').length, 1);
    assert.equal(report.decisions.filter((item) => item.reason === 'incomplete_content').length, 1);
    assert.equal(report.decisions.filter((item) => item.reason === 'unreviewed_source').length, 1);
    assert.ok(report.events.length >= 1 && report.events.length <= 3);
    const serialized = JSON.stringify(report);
    for (const field of ['content', 'narration', 'script', 'apiKey'])
      assert.ok(!serialized.includes(`"${field}"`));
    for (const lang of ['pt', 'en'] as const) assert.ok(newsQueries[topic.id][lang].length <= 200);
  });

test('recortes exigem as duas dimensões de saúde mental e priorizam golpes fora de Crimes', () => {
  assert.equal(
    matchesTopic('mental-health', 'Mudança nas redes sociais', 'Novo recurso de vídeo'),
    false,
  );
  assert.equal(
    matchesTopic('mental-health', 'Estudo sobre saúde mental', 'Pesquisa sobre trabalho'),
    false,
  );
  assert.equal(
    matchesTopic('crime', 'Brasil: polícia investiga golpe digital', 'Fraude financeira'),
    false,
  );
  assert.equal(matchesTopic('fraud', 'Governo discute golpe de estado', 'Debate político'), false);
  assert.equal(
    matchesTopic('politics', 'Congress debates education', 'United States government'),
    false,
  );
});

test('fonte sem revisão, domínio divergente e data de revisão futura não são aceitos', () => {
  const { candidates, registry } = selectionFixture('ai', now);
  assert.equal(selectNews(candidates, 'ai', now, []).report.status, 'insufficient');
  const spoofed = [{ ...candidates[0]!, url: 'https://attacker.example/story' }];
  assert.equal(
    selectNews(spoofed, 'ai', now, registry).report.decisions[0]?.reason,
    'unreviewed_source',
  );
  assert.equal(
    selectNews(
      candidates.slice(0, 1),
      'ai',
      now,
      registry.map((profile) => ({ ...profile, reviewedAt: '2027-01-01T00:00:00Z' })),
    ).report.selected,
    0,
  );
});

test('três domínios do mesmo grupo e créditos de uma única agência não provam independência', () => {
  assert.equal(createSelectionDemo('ai', now, true).report.status, 'insufficient');
  const { candidates, registry } = selectionFixture('ai', now);
  const credited = candidates
    .slice(0, 3)
    .map((article) => ({ ...article, content: `${article.content}\nFonte: Reuters` }));
  const result = selectNews(credited, 'ai', now, registry);
  assert.equal(result.report.independentSources, 1);
  assert.equal(result.report.status, 'insufficient');
  const fromSameOwner = result.articles.map((article, index) => ({
    ...article,
    editorialGroup: 'same-owner',
    originGroup: `different-credit-${index}`,
  }));
  assert.equal(independentSourceCount(fromSameOwner), 1);
});

test('cópias com título diferente não viram fontes novas; relatos distintos do mesmo evento ficam agrupados', () => {
  const { candidates, registry } = selectionFixture('ai', now);
  const originals = candidates.slice(0, 3);
  const copy = {
    ...originals[1]!,
    title: 'Outra manchete sobre inteligência artificial',
    content: originals[0]!.content,
  };
  assert.equal(selectNews([originals[0]!, copy], 'ai', now, registry).report.selected, 1);
  originals[1] = {
    ...originals[1]!,
    title: 'Pesquisa avalia modelos de linguagem e inteligência artificial — exemplo fictício',
  };
  const report = selectNews(originals, 'ai', now, registry).report;
  assert.equal(report.events.length, 2);
  assert.equal(report.events[0]?.articleIds.length, 2);
  assert.equal(report.status, 'ready');
});

test('limites da pauta e insuficiência preservam a janela e nunca completam notícias', () => {
  const { candidates, registry } = selectionFixture('ai', now);
  assert.equal(
    selectNews(candidates.slice(0, 2), 'ai', now, registry).report.status,
    'insufficient',
  );
  const bad = [
    { ...candidates[0]!, url: 'not a URL' },
    { ...candidates[1]!, publishedAt: '2026-11-08' },
  ];
  assert.deepEqual(
    selectNews(bad, 'ai', now, registry).report.decisions.map((item) => item.reason),
    ['invalid', 'invalid_date'],
  );
  assert.throws(
    () =>
      selectNews(
        Array.from({ length: 51 }, () => candidates[0]!),
        'ai',
        now,
        registry,
      ),
    /inválido/,
  );
});

test('a mesma URL antiga não ganha 72 horas novas ao reaparecer com outra data', () => {
  const { candidates, registry } = selectionFixture('ai', now);
  const article = candidates[0]!;
  const old = { ...article, publishedAt: '2026-11-05T10:00:00Z' };
  const fresh = {
    ...article,
    url: `${article.url}?utm_source=updated`,
    publishedAt: '2026-11-08T10:00:00Z',
  };
  const result = selectNews([old, fresh], 'ai', now, registry);
  assert.equal(result.report.selected, 0);
  assert.ok(result.report.decisions.every((decision) => decision.reason === 'outside_window'));
  assert.equal(
    result.report.decisions[1]?.reportedPublishedAt,
    new Date(fresh.publishedAt).toISOString(),
  );
});
