import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  NEWS_WINDOW_MS,
  isRecent,
  canonicalUrl,
  selectArticles,
  episodeExpiresAt,
  assertSufficientSources,
  type Article,
} from '../packages/core/src/news.ts';
import {
  validateEvidence,
  publicEpisode,
  type EpisodeScript,
} from '../packages/core/src/script.ts';
import { correctionRatio } from '../packages/pipeline/audio.ts';
import { topics } from '../packages/core/src/topics.ts';
const now = new Date('2026-10-19T12:00:00Z');
function article(overrides: Partial<Article> = {}): Article {
  return {
    id: 'one',
    title: 'Instituto publica pesquisa sobre inteligência artificial',
    content:
      'O instituto publicou os resultados de uma pesquisa sobre modelos de inteligência artificial. '.repeat(
        12,
      ),
    url: 'https://one.example/noticia',
    publishedAt: '2026-10-19T10:00:00Z',
    publisher: 'Veículo um',
    publisherDomain: 'one.example',
    ...overrides,
  };
}
const second = article({
  id: 'two',
  title: 'Empresa anuncia ferramenta para educação',
  content:
    'A empresa anunciou uma ferramenta de educação com testes públicos previstos para o próximo mês. '.repeat(
      12,
    ),
  url: 'https://two.example/educacao',
  publisher: 'Veículo dois',
  publisherDomain: 'two.example',
});
test('a janela inclui 72 horas exatas e rejeita notícias antigas, futuras ou sem data', () => {
  assert.equal(isRecent(new Date(now.getTime() - NEWS_WINDOW_MS).toISOString(), now), true);
  assert.equal(isRecent(new Date(now.getTime() - NEWS_WINDOW_MS - 1).toISOString(), now), false);
  assert.equal(isRecent('2026-10-19T12:00:01Z', now), false);
  assert.equal(isRecent('sem data', now), false);
  assert.equal(isRecent('2026-10-19T06:00:00-04:00', now), true);
});
test('deduplicação remove rastreamento, republicações e textos insuficientes', () => {
  assert.equal(
    canonicalUrl('https://one.example/noticia?utm_source=x#secao'),
    'https://one.example/noticia',
  );
  assert.equal(
    selectArticles(
      [
        article(),
        article({ url: 'https://one.example/noticia?utm_source=x' }),
        article({ id: 'copy', url: 'https://copy.example/republicacao' }),
        second,
        article({ id: 'short', content: 'Título apenas.' }),
      ],
      now,
    ).length,
    2,
  );
});
test('um veículo e várias matérias não atendem à diversidade mínima', () => {
  assert.throws(
    () => assertSufficientSources([article(), { ...second, publisherDomain: 'one.example' }]),
    /insuficientes/,
  );
  assert.doesNotThrow(() => assertSufficientSources([article(), second]));
});
test('reuso expira com a fonte mais antiga e rejeita fonte vencida durante a geração', () => {
  const oldest = article({
    publishedAt: new Date(now.getTime() - NEWS_WINDOW_MS + 1000).toISOString(),
  });
  assert.equal(episodeExpiresAt([oldest, second], now).getTime(), now.getTime() + 1000);
  assert.throws(() => episodeExpiresAt([oldest], new Date(now.getTime() + 1001)), /expirou/);
});
const script: EpisodeScript = {
  title: 'Pesquisas e educação',
  claims: [
    {
      narration: 'O instituto publicou uma pesquisa.',
      evidence: [{ articleId: 'one', quote: 'O instituto publicou os resultados de uma pesquisa' }],
    },
    {
      narration: 'Uma empresa anunciou uma ferramenta para educação.',
      evidence: [{ articleId: 'two', quote: 'A empresa anunciou uma ferramenta de educação' }],
    },
  ],
};
test('evidências literais são exigidas; fontes inventadas e citações alteradas são rejeitadas', () => {
  assert.doesNotThrow(() => validateEvidence(script, [article(), second]));
  const changed = structuredClone(script);
  changed.claims[0]!.evidence[0]!.quote = 'Uma afirmação inventada que não aparece na matéria';
  assert.throws(() => validateEvidence(changed, [article(), second]), /Evidência/);
  const fake = structuredClone(script);
  fake.claims[0]!.evidence[0]!.articleId = 'unknown';
  assert.throws(() => validateEvidence(fake, [article(), second]), /Evidência/);
});
test('dados públicos não incluem roteiro, evidência privada nem conteúdo das matérias', () => {
  const metadata = JSON.stringify(
    publicEpisode(
      script,
      [article(), second],
      'episode.mp3',
      now,
      new Date(now.getTime() + 1000),
      120,
    ),
  );
  assert.equal(metadata.includes('narration'), false);
  assert.equal(metadata.includes('evidence'), false);
  assert.equal(metadata.includes('content'), false);
  assert.equal(metadata.includes('sources'), true);
});
test('somente ajustes de ritmo de até 3% são permitidos', () => {
  assert.equal(correctionRatio(120), 1);
  assert.equal(correctionRatio(90), null);
  assert.equal(correctionRatio(150), null);
});
test('o catálogo contém exatamente os seis temas definidos', () => {
  assert.equal(topics.length, 6);
  assert.equal(new Set(topics.map((topic) => topic.id)).size, 6);
});
