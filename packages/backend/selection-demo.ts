import type { TopicId } from '../core/src/topics.ts';
import { getTopic } from '../core/src/topics.ts';
import { selectNews, type NewsCandidate } from '../pipeline/selection.ts';
import type { PublisherProfile } from '../pipeline/news-policy.ts';

const expressions: Record<TopicId, [string, string, string]> = {
  ukraine: [
    'Ucrânia: diplomacia e negociações da guerra',
    'Ucrânia: ajuda humanitária no conflito',
    'Ucrânia: impactos do ataque na infraestrutura',
  ],
  ai: [
    'Inteligência artificial: pesquisa avalia modelos de linguagem',
    'Inteligência artificial: ferramenta para escolas',
    'Inteligência artificial: debate sobre regulação',
  ],
  'mental-health': [
    'Redes sociais e saúde mental: estudo sobre ansiedade',
    'Redes sociais e saúde mental: bem-estar digital',
    'Redes sociais e depressão: limites da pesquisa',
  ],
  fraud: [
    'Fraudes e golpes: prevenção de phishing',
    'Fraudes e golpes: alertas sobre transferências',
    'Fraudes e golpes: proteção de dados pessoais',
  ],
  politics: [
    'Governo do Brasil: discussão de políticas públicas',
    'Congresso do Brasil: agenda de educação',
    'Eleições no Brasil: debate sobre transparência',
  ],
  crime: [
    'Brasil: investigação sobre segurança pública',
    'Brasil: polícia apresenta dados de crimes',
    'Brasil: investigação acompanha novo depoimento',
  ],
};
const sampleParagraphs = [
  'O primeiro texto fictício descreve uma análise acadêmica, com participantes, metodologia, resultados e limitações apresentados em detalhes. O material usa uma organização própria, vocabulário específico de avaliação e números inventados que nunca devem ser tratados como fatos. A finalidade deste conteúdo é exercitar o filtro do aplicativo, observar o registro das decisões e comparar o comportamento diante de documentos completos. Cada frase faz parte de um conjunto artificial de testes, sem relação com uma notícia publicada. A equipe precisará revisar exemplos reais antes de aprovar qualquer cobertura jornalística.',
  'Este segundo documento inventado acompanha uma iniciativa comunitária com reuniões, oficinas, planejamento e participação de diferentes equipes locais. A descrição enfatiza atividades práticas, responsáveis pelo cronograma e formas de acompanhamento do projeto. Os detalhes foram escritos exclusivamente para a demonstração do algoritmo e não representam anúncios de organizações existentes. O desenvolvimento técnico depende de testar caminhos previsíveis sem atribuir afirmações a veículos verdadeiros. O exemplo serve para verificar a diversidade de fontes e a escolha de acontecimentos na mesma janela de publicação.',
  'Nesta terceira amostra artificial, um grupo de trabalho debate regras, fiscalização, propostas e prestação de contas em encontros periódicos. O documento descreve pontos de discussão, alternativas consideradas e próximos passos hipotéticos, sempre como exercício de software. Não houve entrevista, apuração ou confirmação de acontecimentos reais. A redação distinta ajuda a separar assuntos e evita confundir uma reportagem original com a simples reprodução de outro texto. Quando o aplicativo receber conteúdo licenciado, essas decisões deverão ser auditadas e revistas com critérios editoriais e exemplos reais.',
];
export function selectionFixture(topicId: TopicId, reference: Date, insufficient = false) {
  const registry: PublisherProfile[] = ['a', 'b', 'c'].map((name) => ({
    domains: [`${name}.example.invalid`],
    editorialGroup: insufficient ? 'same-editorial-group' : `group-${name}`,
    reviewedAt: '2026-01-01T00:00:00Z',
  }));
  const candidates: NewsCandidate[] = expressions[topicId].map((title, index) => ({
    title: `Exemplo fictício: ${title}`,
    content: `${title}. ${sampleParagraphs[index]}`,
    url: `https://${['a', 'b', 'c'][index]}.example.invalid/${topicId}/sample-${index}`,
    publishedAt: new Date(reference.getTime() - (index + 1) * 3600_000).toISOString(),
    publisher: `Fonte fictícia ${index + 1}`,
    publisherDomain: `${['a', 'b', 'c'][index]}.example.invalid`,
  }));
  const first = candidates[0]!;
  candidates.push(
    { ...first, url: `${first.url}?utm_source=copy` },
    {
      ...first,
      url: `${first.url}/old`,
      publishedAt: new Date(reference.getTime() - 73 * 3600_000).toISOString(),
    },
    { ...first, url: `${first.url}/short`, content: 'Apenas uma manchete. [1200 chars]' },
    {
      ...first,
      url: `${first.url}/future`,
      publishedAt: new Date(reference.getTime() + 3600_000).toISOString(),
    },
    {
      ...first,
      url: 'https://unknown.example.invalid/story',
      publisherDomain: 'unknown.example.invalid',
      publisher: 'Fonte fictícia não revisada',
    },
    {
      ...first,
      url: `${first.url}/unrelated`,
      title: 'Exemplo fictício: festival de cinema e exposições culturais',
      content: `Uma programação cultural reúne filmes e exposições. ${sampleParagraphs[2]}`,
    },
  );
  return { candidates, registry, name: getTopic(topicId)!.name };
}
export function createSelectionDemo(topicId: TopicId, reference: Date, insufficient = false) {
  const fixture = selectionFixture(topicId, reference, insufficient);
  return {
    simulated: true as const,
    report: selectNews(fixture.candidates, topicId, reference, fixture.registry).report,
  };
}
