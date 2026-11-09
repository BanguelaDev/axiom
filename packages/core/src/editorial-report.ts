import type { TopicId } from './topics.ts';

export const editorialChecks = {
  sources: 'Fontes recentes e revisadas',
  facts: 'Fatos ligados a trechos das matérias',
  draft: 'Afirmações e título com referências',
  review: 'Revisão de cada afirmação',
  voice_gate: 'Conferência final antes da voz',
} as const;
export type EditorialCheck = keyof typeof editorialChecks;
export const editorialFailures = {
  invalid_structure: 'A estrutura recebida está incompleta ou incompatível.',
  invalid_evidence: 'Um fato não tem evidência válida nas matérias.',
  insufficient_sources: 'Faltam fontes revisadas e independentes.',
  insufficient_content: 'O material não sustenta um resumo com informações suficientes.',
  stale_sources: 'Uma fonte saiu da janela das últimas 72 horas.',
  unmapped_claim: 'Uma afirmação ou o título ficou sem referência válida.',
  attribution_lost: 'Uma declaração perdeu a identificação de quem a fez.',
  unsupported_number: 'Um número não corresponde aos trechos citados.',
  budget_exceeded: 'O conteúdo excede os limites desta preparação.',
  review_rejected: 'A revisão encontrou informação sem suporte ou uma inconsistência.',
  review_mismatch: 'A revisão não cobre exatamente esta versão e suas afirmações.',
  changed_artifact: 'O conteúdo mudou depois da revisão e precisa ser conferido novamente.',
  model_unavailable: 'O serviço de IA está indisponível no momento.',
  incomplete_model: 'A IA não concluiu uma resposta utilizável.',
  refused: 'A IA não produziu o conteúdo solicitado.',
} as const;
export type EditorialFailure = keyof typeof editorialFailures;
export type EditorialScenario = 'approved' | 'missing_evidence' | 'contradiction';
export interface EditorialDemoReport {
  simulated: true;
  topicId: TopicId;
  status: 'approved' | 'blocked';
  reason: EditorialFailure | null;
  sourceCount: number;
  factCount: number;
  claimCount: number;
  checks: { key: EditorialCheck; status: 'passed' | 'blocked' | 'pending' }[];
}
