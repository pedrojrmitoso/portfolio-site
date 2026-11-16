-- Portfolio schema: perfil, links, tecnologias, projetos (+fotos), experiência.
-- Textos traduzíveis em jsonb: {"pt": "...", "en": "...", "fr": "..."}

-- ---------- Admins (quem pode editar) ----------
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- Perfil (linha única) ----------
create table public.profile (
  id smallint primary key default 1 check (id = 1),
  full_name text not null default '',
  role jsonb not null default '{}'::jsonb,        -- cargo / tagline
  bio jsonb not null default '{}'::jsonb,
  location text,
  email text,
  avatar_url text,
  resume_url jsonb not null default '{}'::jsonb,  -- PDF por idioma
  available boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ---------- Links sociais ----------
create table public.social_links (
  id uuid primary key default gen_random_uuid(),
  platform text not null,        -- github | linkedin | indeed | email | website | kaggle | x ...
  label text,
  url text not null,
  sort_order int not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Tecnologias ----------
create table public.technologies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text,                     -- chave do ícone (ex.: "SiSupabase")
  color text,                    -- cor da marca (hex), opcional
  category text not null default 'tools',
  show_in_stack boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- Projetos ----------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,      -- 1 linha no card
  description jsonb not null default '{}'::jsonb,  -- detalhe
  thumbnail_url text,
  demo_url text,
  repo_url text,
  featured boolean not null default false,
  published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  url text not null,
  alt jsonb not null default '{}'::jsonb,
  sort_order int not null default 0
);
create index project_images_project_id_idx on public.project_images (project_id);

create table public.project_technologies (
  project_id uuid not null references public.projects (id) on delete cascade,
  technology_id uuid not null references public.technologies (id) on delete cascade,
  primary key (project_id, technology_id)
);
create index project_technologies_technology_id_idx on public.project_technologies (technology_id);

-- ---------- Experiência ----------
create table public.experiences (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  role jsonb not null default '{}'::jsonb,
  description jsonb not null default '{}'::jsonb,
  start_date date not null,
  end_date date,
  sort_order int not null default 0
);

create trigger profile_touch before update on public.profile
  for each row execute function public.touch_updated_at();
create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();

-- ---------- RLS: leitura pública, escrita só admin ----------
alter table public.admins enable row level security;
alter table public.profile enable row level security;
alter table public.social_links enable row level security;
alter table public.technologies enable row level security;
alter table public.projects enable row level security;
alter table public.project_images enable row level security;
alter table public.project_technologies enable row level security;
alter table public.experiences enable row level security;

create policy "admins read self" on public.admins
  for select to authenticated using (user_id = (select auth.uid()));

-- Leitura pública
create policy "public read" on public.profile for select to anon, authenticated using (true);
create policy "public read" on public.social_links for select to anon, authenticated
  using (visible or (select public.is_admin()));
create policy "public read" on public.technologies for select to anon, authenticated using (true);
create policy "public read" on public.projects for select to anon, authenticated
  using (published or (select public.is_admin()));
create policy "public read" on public.project_images for select to anon, authenticated using (true);
create policy "public read" on public.project_technologies for select to anon, authenticated using (true);
create policy "public read" on public.experiences for select to anon, authenticated using (true);

-- Escrita admin
do $$
declare t text;
begin
  foreach t in array array['profile','social_links','technologies','projects',
                           'project_images','project_technologies','experiences']
  loop
    execute format('create policy "admin insert" on public.%I for insert to authenticated with check ((select public.is_admin()))', t);
    execute format('create policy "admin update" on public.%I for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', t);
    execute format('create policy "admin delete" on public.%I for delete to authenticated using ((select public.is_admin()))', t);
  end loop;
end $$;

-- ---------- Storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('media', 'media', true, 5242880, array['image/png','image/jpeg','image/webp','image/avif','image/svg+xml']),
  ('resume', 'resume', true, 10485760, array['application/pdf'])
on conflict (id) do nothing;

create policy "admin write media/resume" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('media','resume') and (select public.is_admin()));
create policy "admin update media/resume" on storage.objects
  for update to authenticated
  using (bucket_id in ('media','resume') and (select public.is_admin()));
create policy "admin delete media/resume" on storage.objects
  for delete to authenticated
  using (bucket_id in ('media','resume') and (select public.is_admin()));

-- ---------- is_admin fora do schema exposto pela API ----------
create schema if not exists private;
grant usage on schema private to authenticated;
alter function public.is_admin() set schema private;
-- policies de leitura avaliam is_admin() também para anon (schema private não é exposto pela API)
grant usage on schema private to anon;
grant execute on function private.is_admin() to anon, authenticated;
