-- Formulário de contato: mensagens do site, lidas no painel.
-- O público não grava direto na tabela: só pela função submit_contact_message,
-- que valida os campos e limita o volume (por IP e no total).

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 200 and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  project_type text not null check (project_type in ('bi', 'data', 'ai', 'other')),
  message text not null check (char_length(message) between 10 and 5000),
  locale text,
  ip_hash text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index contact_messages_created_at_idx on public.contact_messages (created_at desc);
create index contact_messages_ip_hash_idx on public.contact_messages (ip_hash, created_at);

alter table public.contact_messages enable row level security;

create policy "admin read" on public.contact_messages
  for select to authenticated using ((select private.is_admin()));
create policy "admin update" on public.contact_messages
  for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admin delete" on public.contact_messages
  for delete to authenticated using ((select private.is_admin()));

create or replace function public.submit_contact_message(
  p_name text,
  p_email text,
  p_project_type text,
  p_message text,
  p_locale text,
  p_ip_hash text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Até 3 mensagens por IP por hora e 30 no total por hora
  if p_ip_hash is not null and (
    select count(*) from public.contact_messages
     where ip_hash = p_ip_hash and created_at > now() - interval '1 hour'
  ) >= 3 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  if (
    select count(*) from public.contact_messages where created_at > now() - interval '1 hour'
  ) >= 30 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  insert into public.contact_messages (name, email, project_type, message, locale, ip_hash)
  values (
    trim(p_name),
    lower(trim(p_email)),
    p_project_type,
    trim(p_message),
    left(p_locale, 5),
    left(p_ip_hash, 64)
  );
end;
$$;

revoke execute on function public.submit_contact_message(text, text, text, text, text, text) from public;
grant execute on function public.submit_contact_message(text, text, text, text, text, text) to anon, authenticated;
