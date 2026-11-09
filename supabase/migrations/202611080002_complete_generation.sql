alter table public.episodes add column audio_sha256 text;
alter table public.episode_sources add column editorial_group text;
alter table public.episode_sources add column origin_group text;
create table private.episode_quality (
  episode_id uuid primary key references public.episodes(id) on delete cascade,
  checks jsonb not null,
  created_at timestamptz not null default now()
);
alter table private.episode_quality enable row level security;
revoke all on private.episode_quality from public, anon, authenticated;
grant all on private.episode_quality to service_role;

create function public.complete_generation(p_job_id uuid, p_payload jsonb, p_script jsonb, p_quality jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_job public.generation_jobs%rowtype;
  v_expiration timestamptz;
  v_generated timestamptz;
  v_audio_path text;
  v_sha text;
begin
  select * into v_job from public.generation_jobs where id = p_job_id for update;
  if not found then raise exception 'invalid_job'; end if;
  v_sha := p_payload->>'sha256';
  if v_job.stage = 'ready' then
    if exists(select 1 from public.episodes where id = v_job.episode_id and status = 'ready' and audio_sha256 = v_sha and expires_at > now()) then return v_job.episode_id; end if;
    raise exception 'invalid_job';
  end if;
  if v_job.stage not in ('queued', 'processing') or v_job.updated_at < now() - interval '10 minutes' then raise exception 'invalid_job'; end if;
  v_generated := (p_payload->>'generatedAt')::timestamptz;
  v_expiration := (p_payload->>'expiresAt')::timestamptz;
  v_audio_path := p_payload->>'audioPath';
  if p_payload->>'topicId' is distinct from v_job.topic_id or
     coalesce(length(trim(p_payload->>'title')), 0) = 0 or
     v_sha is null or v_sha !~ '^[a-f0-9]{64}$' or
     v_audio_path is distinct from p_job_id::text || '/' || v_sha || '.mp3' or
     v_generated is null or v_expiration is null or v_generated > now() + interval '5 seconds' or
     v_generated < now() - interval '10 minutes' or v_expiration <= now() or v_expiration > v_generated + interval '1 hour' or
     coalesce((p_payload->>'duration')::numeric, 0) not between 119 and 121 or
     jsonb_typeof(p_payload->'sources') is distinct from 'array' or jsonb_array_length(p_payload->'sources') < 2 or
     jsonb_array_length(p_payload->'sources') > 6 or
     jsonb_typeof(p_script->'claims') is distinct from 'array' or jsonb_array_length(p_script->'claims') < 2 or
     coalesce(p_quality->>'sha256', '') <> v_sha or
     not exists(select 1 from storage.objects where bucket_id = 'episodes' and name = v_audio_path)
     then raise exception 'invalid_episode'; end if;
  if exists(select 1 from jsonb_array_elements(p_payload->'sources') s where
    s->>'url' is null or s->>'url' !~ '^https?://' or
    coalesce(length(trim(s->>'publisher')), 0) = 0 or coalesce(length(trim(s->>'title')), 0) = 0 or
    coalesce(length(trim(s->>'editorialGroup')), 0) = 0 or coalesce(length(trim(s->>'originGroup')), 0) = 0 or
    s->>'publishedAt' is null or (s->>'publishedAt')::timestamptz < now() - interval '72 hours' or
    (s->>'publishedAt')::timestamptz > now() or v_expiration > (s->>'publishedAt')::timestamptz + interval '72 hours'
  ) or (select count(distinct s->>'editorialGroup') from jsonb_array_elements(p_payload->'sources') s) < 2 or
       (select count(distinct s->>'originGroup') from jsonb_array_elements(p_payload->'sources') s) < 2 then raise exception 'invalid_sources'; end if;
  -- Metadados, referências, roteiro e trabalho tornam-se consistentes na mesma transação.
  insert into public.episodes(id, topic_id, status, title, generated_at, expires_at, duration_seconds, audio_path, audio_sha256)
    values(p_job_id, v_job.topic_id, 'ready', p_payload->>'title', v_generated, v_expiration, (p_payload->>'duration')::numeric, v_audio_path, v_sha);
  insert into public.episode_sources(episode_id, publisher, title, url, published_at, editorial_group, origin_group)
    select p_job_id, s->>'publisher', s->>'title', s->>'url', (s->>'publishedAt')::timestamptz, s->>'editorialGroup', s->>'originGroup'
    from jsonb_array_elements(p_payload->'sources') s;
  insert into private.episode_scripts(episode_id, script) values(p_job_id, p_script);
  insert into private.episode_quality(episode_id, checks) values(p_job_id, p_quality);
  update public.generation_jobs set stage = 'ready', episode_id = p_job_id, safe_error = null, updated_at = now() where id = p_job_id;
  return p_job_id;
end;
$$;
revoke all on function public.complete_generation(uuid, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.complete_generation(uuid, jsonb, jsonb, jsonb) to service_role;
