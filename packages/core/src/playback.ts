export function audioProgress(position: number, duration: number) {
  const total = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const seconds = Number.isFinite(position) ? Math.max(0, Math.min(total, position)) : 0;
  return { seconds, duration: total, fraction: total ? seconds / total : 0 };
}
export function secondsFromProgress(fraction: number, duration: number) {
  return audioProgress(
    (Number.isFinite(fraction) ? Math.max(0, Math.min(1, fraction)) : 0) * duration,
    duration,
  ).seconds;
}
export function supportsNativeAudioControls(platform: string, expoGo: boolean) {
  return ['android', 'ios'].includes(platform) && !expoGo;
}
