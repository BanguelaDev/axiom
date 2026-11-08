import { task } from '@trigger.dev/sdk';
import { createClient } from '@supabase/supabase-js';

/** Reserva de contrato da fila. Será substituída pela orquestração validada nas etapas 4–6. */
export const generation = task({
  id: 'axiom-generation',
  queue: { concurrencyLimit: 2 },
  maxDuration: 600,
  run: async (payload: { jobId: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(payload.jobId)) throw new Error('Identificador inválido.');
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Infraestrutura não configurada.');
    const client = createClient(url, key, { auth: { persistSession: false } });
    const { error } = await client
      .from('generation_jobs')
      .update({
        stage: 'failed',
        safe_error: 'integration_pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', payload.jobId)
      .in('stage', ['queued', 'processing']);
    if (error) throw new Error('Não foi possível atualizar o estado do trabalho.');
    return { status: 'integration_pending' };
  },
});
