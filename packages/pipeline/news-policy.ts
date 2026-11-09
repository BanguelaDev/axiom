import type { TopicId } from '../core/src/topics.ts';

export const newsQueries: Record<TopicId, { pt: string; en: string }> = {
  ukraine: {
    pt: 'Ucrânia AND (guerra OR diplomacia OR ataque)',
    en: 'Ukraine AND (war OR diplomacy OR attack)',
  },
  ai: {
    pt: '"inteligência artificial" OR "modelos de linguagem"',
    en: '"artificial intelligence" OR "large language models"',
  },
  'mental-health': {
    pt: '"redes sociais" AND ("saúde mental" OR ansiedade OR depressão)',
    en: '"social media" AND ("mental health" OR anxiety OR depression)',
  },
  fraud: {
    pt: 'golpe OR "fraude financeira" OR phishing',
    en: 'scam OR "financial fraud" OR phishing',
  },
  politics: {
    pt: '(governo OR Congresso OR eleições) AND Brasil',
    en: '(government OR Congress OR election) AND Brazil',
  },
  crime: {
    pt: '(investigação OR "segurança pública" OR crime) AND Brasil NOT golpe NOT fraude',
    en: '(investigation OR "public safety" OR crime) AND Brazil NOT scam NOT fraud',
  },
};
export function normalizedText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}
export function matchesTopic(topic: TopicId, title: string, content: string): boolean {
  // Filtro lexical inicial, a calibrar com notícias reais e complementar pela revisão editorial.
  const text = normalizedText(`${title} ${content}`);
  const fraud =
    /\b(golpes?|fraudes?|phishing|scams?)\b/.test(text) && !/\bgolpe de estado\b/.test(text);
  const brazil = /\b(brasil|brazil|brasileir[oa]s?)\b/.test(text);
  switch (topic) {
    case 'ukraine':
      return (
        /\b(ucrania|ukraine|ucranian[oa]s?|ukrainian)\b/.test(text) &&
        /\b(guerra|war|diplomacia|diplomacy|ataques?|attacks?|humanitari[oa]s?|humanitarian)\b/.test(
          text,
        )
      );
    case 'ai':
      // Uma menção distante no corpo não torna o assunto central da matéria.
      return /\b(inteligencia artificial|artificial intelligence|modelos de linguagem|large language models?|chatbots?|ia|ai)\b/.test(
        normalizedText(`${title} ${content.slice(0, 650)}`),
      );
    case 'mental-health':
      return (
        /\b(redes sociais|social media|instagram|tiktok)\b/.test(text) &&
        /\b(saude mental|mental health|ansiedade|anxiety|depressao|depression)\b/.test(text)
      );
    case 'fraud':
      return fraud;
    case 'politics':
      return (
        brazil &&
        /\b(governo|government|congresso|congress|eleicoes|elections?|parlamento|parliament|politicas publicas|public policy)\b/.test(
          text,
        )
      );
    case 'crime':
      return (
        brazil &&
        !fraud &&
        /\b(crimes?|investigacao|investigation|seguranca publica|public safety|policia|police)\b/.test(
          text,
        )
      );
  }
}

export interface PublisherProfile {
  domains: string[];
  editorialGroup: string;
  reviewedAt: string;
}
export function attributionGroup(content: string): string | undefined {
  const credit =
    /(?:^|\n)(?:fonte|source|por|by|via|cr[eé]ditos?)\s*:\s*(Reuters|Associated Press|AP|AFP|Ag[êe]ncia Brasil)\b/i.exec(
      content,
    )?.[1];
  return credit
    ? `agency:${normalizedText(credit).replace(/^ap$/, 'associated press')}`
    : undefined;
}
