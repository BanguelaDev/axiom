export const topics = [
  {
    id: 'ukraine',
    name: 'Guerra da Ucrânia',
    description: 'O conflito, a diplomacia e seus impactos.',
    query: '(Ucrânia OR Ukraine) AND (guerra OR war OR diplomacia)',
    symbol: 'globe.europe.africa',
    icon: 'earth',
    color: '#60A5FA',
    rule: 'Atribua declarações das partes. Não trate alegações militares como confirmação independente.',
  },
  {
    id: 'ai',
    name: 'Inteligência Artificial',
    description: 'As ideias e os avanços que mudam o futuro.',
    query: '"inteligência artificial" OR "artificial intelligence"',
    symbol: 'cpu',
    icon: 'chip',
    color: '#A78BFA',
    rule: 'A inteligência artificial deve ser o assunto central, não apenas o setor de uma empresa citada. Diferencie anúncio comercial, produto disponível e resultado de pesquisa.',
  },
  {
    id: 'mental-health',
    name: 'Redes Sociais e Saúde Mental',
    description: 'A vida conectada e o cuidado com a mente.',
    query: '("redes sociais" OR "social media") AND ("saúde mental" OR "mental health")',
    symbol: 'bubble.left.and.bubble.right',
    icon: 'message-outline',
    color: '#34D399',
    rule: 'Exija relação com redes sociais e saúde mental. Não infira causalidade nem ofereça diagnóstico.',
  },
  {
    id: 'fraud',
    name: 'Fraudes e Golpes',
    description: 'Informação para reconhecer riscos e se proteger.',
    query: 'golpe OR "fraude financeira" OR phishing',
    symbol: 'shield.lefthalf.filled',
    icon: 'shield-outline',
    color: '#FBBF24',
    rule: 'Explique prevenção sem ensinar a executar golpes.',
  },
  {
    id: 'politics',
    name: 'Política',
    description: 'As decisões que fazem parte da nossa vida.',
    query: '(governo OR Congresso OR eleições) AND Brasil',
    symbol: 'building.columns',
    icon: 'bank-outline',
    color: '#22D3EE',
    rule: 'Priorize o Brasil. Separe fato, opinião e promessa. Atribua declarações.',
  },
  {
    id: 'crime',
    name: 'Crimes',
    description: 'Investigações e segurança pública, com contexto.',
    query: '(investigação OR "segurança pública" OR crime) AND Brasil NOT golpe NOT phishing',
    symbol: 'magnifyingglass',
    icon: 'magnify',
    color: '#FB7185',
    rule: 'Diferencie suspeita, acusação e condenação. Não exponha vítimas nem detalhes gráficos.',
  },
] as const;
export type Topic = (typeof topics)[number];
export type TopicId = Topic['id'];
export function getTopic(id: string): Topic | undefined {
  return topics.find((topic) => topic.id === id);
}
