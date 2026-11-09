import { task } from '@trigger.dev/sdk';
import { createClient } from '@supabase/supabase-js';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, dirname, basename } from 'node:path';
import { runGenerationWorker } from '../backend/generation-worker.ts';
import { generatePodcast } from '../pipeline/generate-podcast.ts';

/** Worker com reserva exclusiva e sem repetição automática da tarefa inteira. */
export const generation = task({
  id: 'axiom-generation',
  queue: { concurrencyLimit: 2 },
  maxDuration: 600,
  retry: { maxAttempts: 1 },
  run: async (payload: { jobId: string }) => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Infraestrutura não configurada.');
    const client = createClient(url, key, { auth: { persistSession: false } });
    const temporary = await mkdtemp(resolve(tmpdir(), 'axiom-job-'));
    try {
      return await runGenerationWorker(client, payload.jobId, (topic, _id, onPhase) =>
        generatePodcast(topic, temporary, onPhase),
      );
    } finally {
      const target = resolve(temporary),
        base = resolve(tmpdir());
      if (dirname(target) !== base || !basename(target).startsWith('axiom-job-'))
        throw new Error('Diretório temporário inválido.');
      await rm(target, { recursive: true, force: true });
    }
  },
});
