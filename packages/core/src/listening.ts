import { getTopic, type TopicId } from './topics.ts';

export const DEMO_DURATION = 12;
export type ThemePreference = 'system' | 'light' | 'dark';
export type HistoryItem = { topicId: TopicId; playedAt: string; position: number };
export type Preferences = { themePreference: ThemePreference; history: HistoryItem[] };
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}
export function clampPosition(position: number, duration = DEMO_DURATION): number {
  return Number.isFinite(position) ? Math.min(Math.max(0, position), Math.max(0, duration)) : 0;
}
export function resumePosition(position: number, duration: number): number {
  const safe = clampPosition(position, duration);
  return safe >= duration - 0.25 ? 0 : safe;
}
export function parsePreferences(raw: string | null): Preferences {
  const defaults: Preferences = { themePreference: 'dark', history: [] };
  if (!raw) return defaults;
  const data: unknown = JSON.parse(raw);
  if (!record(data)) return defaults;
  const history: HistoryItem[] = [];
  if (Array.isArray(data.history)) {
    const ids = new Set<string>();
    for (const value of data.history) {
      if (
        !record(value) ||
        typeof value.topicId !== 'string' ||
        !getTopic(value.topicId) ||
        typeof value.playedAt !== 'string' ||
        !Number.isFinite(Date.parse(value.playedAt)) ||
        typeof value.position !== 'number' ||
        !Number.isFinite(value.position) ||
        ids.has(value.topicId)
      )
        continue;
      ids.add(value.topicId);
      history.push({
        topicId: value.topicId as TopicId,
        playedAt: value.playedAt,
        position: clampPosition(value.position),
      });
      if (history.length === 40) break;
    }
  }
  return {
    themePreference: isThemePreference(data.themePreference) ? data.themePreference : 'dark',
    history,
  };
}
export function updateHistoryPosition(
  items: HistoryItem[],
  topicId: TopicId,
  position: number,
): HistoryItem[] {
  const safe = clampPosition(position);
  if (!items.some((item) => item.topicId === topicId && Math.abs(item.position - safe) > 0.01))
    return items;
  return items.map((item) => (item.topicId === topicId ? { ...item, position: safe } : item));
}
