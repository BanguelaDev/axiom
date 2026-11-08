-- Base transacional da API. Chamada somente por uma sessão validada na Edge Function.
-- Metadados públicos também passam pela API; evita expor audio_path e detalhes operacionais.
revoke select on public.episodes, public.episode_sources, public.generation_jobs from authenticated;

alter table public.generation_jobs drop constraint generation_jobs_user_id_fkey;
alter table public.generation_jobs alter column user_id drop not null;
alter table public.generation_jobs add constraint generation_jobs_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;
alter table public.generation_jobs add column trigger_run_id text;
alter table public.generation_jobs add constraint valid_job_stage
  check (stage in ('queued', 'processing', 'ready', 'failed'));
create unique index one_active_job_per_topic on public.generation_jobs(topic_id)
  where stage in ('queued', 'processing');

create table public.generation_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.generation_jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, job_id)
);
create index generation_requests_user_time on public.generation_requests(user_id, created_at);
alter table public.generation_requests enable row level security;
revoke all on public.generation_requests from public, anon, authenticated;
grant select on public.generation_requests to authenticated;
grant all on public.generation_requests to service_role;
create policy own_requests_read on public.generation_requests for select to authenticated
  using ((select auth.uid()) = user_id);

create table private.request_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  requested_at timestamptz not null default now()
);
create index request_limits_user_time on private.request_limits(user_id, requested_at);
alter table private.request_limits enable row level security;
revoke all on private.request_limits from public, anon, authenticated;
grant all on private.request_limits to service_role;

create function public.request_generation(p_user_id uuid, p_topic_id text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_job_id uuid;
  v_episode_id uuid;
begin
  if not exists(select 1 from auth.users where id = p_user_id) or
     not exists(select 1 from public.topics where id = p_topic_id) then
    raise exception 'invalid_request';
  end if;
  -- Um lock global curto cobre quotas e a reserva de uma edição. Sem chamadas de rede na transação.
  perform pg_advisory_xact_lock(813509);
  delete from private.request_limits where requested_at < now() - interval '1 day';
  if (select count(*) from private.request_limits where user_id = p_user_id and requested_at > now() - interval '1 minute') >= 6 or
     (select count(*) from private.request_limits where user_id = p_user_id and requested_at > now() - interval '1 hour') >= 12 then
    raise exception 'rate_limited';
  end if;
  insert into private.request_limits(user_id) values(p_user_id);

  select e.id into v_episode_id from public.episodes e
    where e.topic_id = p_topic_id and e.status = 'ready' and e.expires_at > now()
      and e.generated_at > now() - interval '1 hour'
      and (select count(*) from public.episode_sources s where s.episode_id = e.id) >= 2
      and not exists(select 1 from public.episode_sources s where s.episode_id = e.id and
        (s.published_at < now() - interval '72 hours' or s.published_at > now()))
    order by e.generated_at desc limit 1;
  if v_episode_id is not null then
    return jsonb_build_object('episode_id', v_episode_id);
  end if;

  update public.generation_jobs set stage = 'failed', safe_error = 'timeout', updated_at = now()
    where stage in ('queued', 'processing') and updated_at < now() - interval '10 minutes';
  select id into v_job_id from public.generation_jobs
    where topic_id = p_topic_id and stage in ('queued', 'processing') limit 1;
  if v_job_id is null then
    if (select count(*) from public.generation_jobs where stage in ('queued', 'processing')) >= 2 or
       (select count(*) from public.generation_jobs where created_at > now() - interval '1 hour') >= 30 then
      raise exception 'rate_limited';
    end if;
    insert into public.generation_jobs(user_id, topic_id, edition_key)
      values(p_user_id, p_topic_id, p_topic_id || ':' || gen_random_uuid()::text) returning id into v_job_id;
  end if;
  insert into public.generation_requests(user_id, job_id) values(p_user_id, v_job_id)
    on conflict (user_id, job_id) do nothing;
  return jsonb_build_object('job_id', v_job_id);
end;
$$;
revoke all on function public.request_generation(uuid, text) from public, anon, authenticated;
grant execute on function public.request_generation(uuid, text) to service_role;

-- Não criar políticas para storage.objects: somente o servidor assina acesso temporário.
