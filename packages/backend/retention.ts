import { mkdir, readdir, lstat, realpath, rename, rm } from 'node:fs/promises';
import { resolve, relative, dirname, isAbsolute } from 'node:path';
export const retentionDays = {
  episodes: 7,
  quarantine: 7,
  feedback: 30,
  events: 90,
  publicationMemory: 180,
} as const;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** Somente pastas UUID diretas do pipeline; links e destinos fora da raiz são recusados. */
export async function retainEpisodes(workRoot: string, apply = false, now = Date.now()) {
  const active = resolve(workRoot, 'local-episodes'),
    retired = resolve(workRoot, 'retired-episodes');
  for (const root of [active, retired]) await mkdir(root, { recursive: true, mode: 0o700 });
  const report = { quarantined: 0, removed: 0, apply };
  async function entries(
    root: string,
    days: number,
    action: (path: string, id: string) => Promise<void>,
  ) {
    const realRoot = await realpath(root);
    // Não seguir uma raiz substituída por link.
    if ((await lstat(root)).isSymbolicLink()) throw new Error('Raiz de retenção inválida.');
    for (const name of await readdir(root)) {
      if (!uuid.test(name)) continue;
      const target = resolve(root, name),
        stat = await lstat(target);
      if (!stat.isDirectory() || stat.isSymbolicLink() || stat.mtimeMs > now - days * 86_400_000)
        continue;
      const realTarget = await realpath(target),
        child = relative(realRoot, realTarget);
      if (isAbsolute(child) || child.startsWith('..') || dirname(target) !== root)
        throw new Error('Destino de retenção fora da pasta esperada.');
      await action(target, name);
    }
  }
  // Processa a quarentena primeiro, para não remover um arquivo recém-movido.
  await entries(retired, retentionDays.quarantine, async (path) => {
    report.removed++;
    if (apply) await rm(path, { recursive: true });
  });
  await entries(active, retentionDays.episodes, async (path, id) => {
    report.quarantined++;
    if (apply) {
      const destination = resolve(retired, id);
      try {
        await lstat(destination);
        throw new Error('Já existe uma pasta com esse ID na quarentena.');
      } catch (error) {
        if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
      }
      await rename(path, destination);
      // A quarentena ganha seu próprio prazo, independente da idade original.
      const { utimes } = await import('node:fs/promises');
      await utimes(destination, now / 1000, now / 1000);
    }
  });
  return report;
}
