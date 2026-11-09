export const feedbackKinds = ['content', 'audio', 'sources', 'voice-rating'] as const;
export type EpisodeFeedback = {
  kind: (typeof feedbackKinds)[number];
  clarity?: number;
  naturalness?: number;
};
export function parseFeedback(value: unknown): EpisodeFeedback {
  if (!value || typeof value !== 'object') throw new Error('Avaliação inválida.');
  const item = value as Record<string, unknown>;
  if (
    !feedbackKinds.includes(item.kind as EpisodeFeedback['kind']) ||
    Object.keys(item).some((key) => !['kind', 'clarity', 'naturalness'].includes(key))
  )
    throw new Error('Avaliação inválida.');
  if (item.kind === 'voice-rating') {
    if (
      ![item.clarity, item.naturalness].every(
        (n) => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 5,
      )
    )
      throw new Error('Use notas de 1 a 5.');
    return {
      kind: 'voice-rating',
      clarity: item.clarity as number,
      naturalness: item.naturalness as number,
    };
  }
  if (item.clarity !== undefined || item.naturalness !== undefined)
    throw new Error('Avaliação inválida.');
  return { kind: item.kind as EpisodeFeedback['kind'] };
}
