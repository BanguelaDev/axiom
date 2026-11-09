const players = new Map<string, () => void>();
export function registerPlayback(id: string, pause: () => void) {
  players.set(id, pause);
  return () => {
    if (players.get(id) === pause) players.delete(id);
  };
}
export function claimPlayback(id: string) {
  for (const [other, pause] of players) if (other !== id) pause();
}
