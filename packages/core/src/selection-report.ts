import type { TopicId } from './topics.ts';

export const selectionReasons = {
  selected: 'Selecionada para a pauta',
  invalid: 'Dados ou endereço inválidos',
  invalid_date: 'Data sem horário, fuso ou validade',
  outside_window: 'Publicação fora das últimas 72 horas',
  future_date: 'Publicação com data futura',
  incomplete_content: 'Conteúdo curto ou truncado',
  off_topic: 'Não atende ao recorte do tema',
  unreviewed_source: 'Fonte ainda não revisada',
  duplicate: 'Cópia ou endereço repetido',
  selection_limit: 'Fora do limite desta edição',
} as const;
export type SelectionReason = keyof typeof selectionReasons;
export interface SelectionReport {
  version: 1;
  algorithm: string;
  topicId: TopicId;
  referenceAt: string;
  status: 'ready' | 'insufficient';
  received: number;
  selected: number;
  independentSources: number;
  events: { id: string; articleIds: string[] }[];
  decisions: {
    id: string;
    title: string;
    publisher: string;
    publishedAt: string | null;
    reason: SelectionReason;
    relatedTo?: string;
    url?: string;
    editorialGroup?: string;
    originGroup?: string;
    reportedPublishedAt?: string;
  }[];
}
export interface DemoSelection {
  simulated: true;
  report: SelectionReport;
}
