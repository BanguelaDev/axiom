import type { TopicId } from './topics.ts';

export const apiVersion = 1;
export type ApiEnvironment = 'development' | 'staging' | 'production';
export type GenerationStage = 'queued' | 'processing' | 'ready' | 'failed';
export interface ApiHealth {
  version: number;
  environment: ApiEnvironment;
  generationAvailable: boolean;
}
export interface PublicTopic {
  id: TopicId;
  name: string;
  description: string;
}
export interface PublicJob {
  id: string;
  topicId: TopicId;
  stage: GenerationStage;
  episodeId: string | null;
  message: string | null;
}
export interface PublicEpisode {
  id: string;
  topicId: TopicId;
  title: string;
  generatedAt: string;
  expiresAt: string;
  durationSeconds: number;
  sources: { publisher: string; title: string; url: string; publishedAt: string }[];
}
export type GenerationResult =
  { kind: 'job'; job: PublicJob } | { kind: 'episode'; episode: PublicEpisode };
export const generationMessages = {
  interrupted:
    'O servidor foi reiniciado durante a preparação. Seu pedido foi preservado; solicite uma nova tentativa para continuar.',
  failed: 'Não foi possível preparar este episódio. Tente novamente mais tarde.',
  free_quota:
    'A cota gratuita da IA foi atingida. Aguarde a renovação e tente novamente. Nenhum serviço pago será usado.',
  insufficient_news:
    'Não há notícias recentes suficientes de fontes distintas para este tema. Tente outro assunto; a janela de 72 horas é mantida.',
} as const;

export const apiMessages = {
  unauthorized: 'Sua sessão precisa ser renovada. Tente novamente.',
  invalid_request: 'Confira o tema e tente novamente.',
  not_found: 'Este conteúdo não está disponível para sua sessão.',
  generation_unavailable: 'A geração de podcasts ainda está em configuração.',
  rate_limited: 'Muitas solicitações. Aguarde um pouco e tente novamente.',
  temporarily_unavailable: 'O serviço está indisponível no momento. Tente novamente.',
} as const;
export type ApiErrorCode = keyof typeof apiMessages;

export class ApiFault extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    public readonly status: number,
  ) {
    super(apiMessages[code]);
  }
}
