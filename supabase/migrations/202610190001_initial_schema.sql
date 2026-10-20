-- Base para a etapa 3. Revisar e testar em Supabase local antes de aplicar em produção.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table public.topics (
  id text primary key,
  name text not null
);
insert into public.topics (id, name) values
  ('ukraine', 'Guerra da Ucrânia'), ('ai', 'Inteligência Artificial'),
  ('mental-health', 'Redes Sociais e Saúde Mental'), ('fraud', 'Fraudes e Golpes'),
  ('politics', 'Política'), ('crime', 'Crimes');

create table public.episodes (
  id uuid primary key default gen_random_uuid(),
  topic_id text not null references public.topics(id),
  status text not null default 'queued' check (status in ('queued', 'processing', 'ready', 'failed', 'withdrawn')),
  title text,
  generated_at timestamptz,
  expires_at timestamptz,
  duration_seconds numeric,
  audio_path text,
  created_at timestamptz not null default now(),
  constraint ready_episode_complete check (status <> 'ready' or (
    title is not null and generated_at is not null and expires_at is not null and
    expires_at > generated_at and duration_seconds is not null and
    duration_seconds between 119 and 121 and audio_path is not null
  ))
);
create index episodes_topic_validity on public.episodes(topic_id, status, expires_at);

create table public.episode_sources (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.episodes(id) on delete cascade,
  publisher text not null,
  title text not null,
  url text not null check (url ~ '^https?://'),
  published_at timestamptz not null
);
create index episode_sources_episode on public.episode_sources(episode_id);

create table public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  episode_id uuid references public.episodes(id),
  topic_id text not null references public.topics(id),
  edition_key text not null unique,
  stage text not null default 'queued',
  safe_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index generation_jobs_user on public.generation_jobs(user_id);

create table private.episode_scripts (
  episode_id uuid primary key references public.episodes(id) on delete cascade,
  script jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.topics enable row level security;
alter table public.episodes enable row level security;
alter table public.episode_sources enable row level security;
alter table public.generation_jobs enable row level security;
alter table private.episode_scripts enable row level security;

revoke all on public.topics, public.episodes, public.episode_sources, public.generation_jobs from anon, authenticated;
grant select on public.topics, public.episodes, public.episode_sources, public.generation_jobs to authenticated;
grant all on public.topics, public.episodes, public.episode_sources, public.generation_jobs to service_role;
grant all on private.episode_scripts to service_role;
revoke all on private.episode_scripts from public, anon, authenticated;

create policy topics_read on public.topics for select to authenticated using (true);
create policy episodes_read on public.episodes for select to authenticated using (status = 'ready' and expires_at > now());
create policy sources_read on public.episode_sources for select to authenticated using (
  exists (select 1 from public.episodes e where e.id = episode_id and e.status = 'ready' and e.expires_at > now())
);
create policy own_jobs_read on public.generation_jobs for select to authenticated using ((select auth.uid()) = user_id);
-- Sem políticas de escrita no cliente: uma futura Edge Function validará sessão e orçamento.
-- Sem políticas de leitura para roteiros nem para objetos de áudio: acesso somente pelo servidor.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('episodes', 'episodes', false, 10485760, array['audio/mpeg'])
on conflict (id) do nothing;
