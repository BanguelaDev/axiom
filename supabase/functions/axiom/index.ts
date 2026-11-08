import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import { tasks, configure } from 'npm:@trigger.dev/sdk@4.8.3';
import { createApi } from '../../../packages/backend/handler.ts';
import { SupabaseRepository } from '../../../packages/backend/supabase-repository.ts';

const url = Deno.env.get('SUPABASE_URL')!;
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const triggerKey = Deno.env.get('TRIGGER_SECRET_KEY');
if (triggerKey) configure({ secretKey: triggerKey });
const environment = Deno.env.get('AXIOM_ENVIRONMENT');
if (environment !== 'staging' && environment !== 'production')
  throw new Error('Configure AXIOM_ENVIRONMENT.');

Deno.serve(
  createApi({
    environment,
    // A tarefa desta etapa valida infraestrutura; não produz notícias. Habilitar na integração futura.
    generationAvailable: false,
    allowedOrigins: (Deno.env.get('ALLOWED_ORIGINS') || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
    async authenticate(token) {
      const { data, error } = await client.auth.getUser(token);
      return error ? null : data.user?.id || null;
    },
    repository: new SupabaseRepository(client),
    async enqueue(jobId) {
      if (!triggerKey) throw new Error('Fila indisponível.');
      // A mesma reserva sempre usa a mesma chave, inclusive depois de falhas de rede.
      await tasks.trigger(
        'axiom-generation',
        { jobId },
        { idempotencyKey: jobId, idempotencyKeyTTL: '24h' },
      );
    },
  }),
);
