export const audioFailures = {
  invalid_audio: 'O arquivo de áudio está vazio, incompatível ou danificado.',
  excessive_silence: 'O áudio tem silêncio excessivo e precisa ser refeito.',
  duration_out_of_range: 'A duração exige uma nova redação e revisão do roteiro.',
  invalid_volume: 'O volume do áudio final ficou fora da faixa esperada.',
  processing_failed: 'Não foi possível concluir o processamento do áudio.',
  voice_unavailable: 'O serviço de voz está indisponível. Tente novamente mais tarde.',
  voice_quota: 'O serviço de voz atingiu o limite disponível.',
  voice_configuration: 'A voz ainda precisa ser configurada no servidor.',
  attempts_exhausted: 'O áudio não atingiu a duração após as correções permitidas.',
  artifact_changed: 'O arquivo mudou depois da validação e não pode ser liberado.',
  publication_failed: 'Não foi possível confirmar o armazenamento do episódio.',
} as const;
export type AudioFailure = keyof typeof audioFailures;
export interface AudioMetrics {
  duration: number;
  codec: string;
  sampleRate: number;
  channels: number;
  bytes: number;
  integratedLufs: number | null;
  truePeakDb: number | null;
  silenceSeconds: number;
  longestSilence: number;
}
export interface AudioDemoReport {
  synthetic: true;
  status: 'ready' | 'blocked';
  reason: AudioFailure | null;
  metrics: AudioMetrics | null;
  mediaPath: string | null;
  expiresIn: number;
}
