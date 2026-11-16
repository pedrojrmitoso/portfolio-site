-- Endurecimento de autenticação e integridade.

-- 1) Admin só com sessão de senha (ou senha + TOTP).
--    Sessões de link de recuperação / link mágico (amr "recovery"/"otp") não escrevem nada.
--    Se o admin tiver 2 fatores verificados, exige aal2.
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (select 1 from public.admins where user_id = (select auth.uid()))
    and coalesce(
      (select auth.jwt() -> 'amr') @> '[{"method": "password"}]'::jsonb
      or (select auth.jwt() -> 'amr') @> '[{"method": "totp"}]'::jsonb,
      false
    )
    and (
      (select auth.jwt() ->> 'aal') = 'aal2'
      or not exists (
        select 1 from auth.mfa_factors f
        where f.user_id = (select auth.uid()) and f.status = 'verified'
      )
    );
$$;

-- 2) Fotos e tecnologias seguem a visibilidade do projeto
--    (a RLS de projects já esconde rascunhos de quem não é admin).
drop policy "public read" on public.project_images;
create policy "public read" on public.project_images
  for select to anon, authenticated
  using (exists (select 1 from public.projects p where p.id = project_id));

drop policy "public read" on public.project_technologies;
create policy "public read" on public.project_technologies
  for select to anon, authenticated
  using (exists (select 1 from public.projects p where p.id = project_id));

-- 3) Gravações atômicas (security invoker: a RLS continua valendo).
create or replace function public.set_project_relations(
  p_project_id uuid,
  p_images jsonb,
  p_technology_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  delete from public.project_images where project_id = p_project_id;
  insert into public.project_images (project_id, url, alt, sort_order)
  select p_project_id, i ->> 'url', coalesce(i -> 'alt', '{}'::jsonb), (i ->> 'sort_order')::int
  from jsonb_array_elements(coalesce(p_images, '[]'::jsonb)) as i;

  delete from public.project_technologies where project_id = p_project_id;
  insert into public.project_technologies (project_id, technology_id)
  select p_project_id, t from unnest(coalesce(p_technology_ids, '{}')) as t;
end;
$$;

create or replace function public.reorder_projects(p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  update public.projects p
     set sort_order = o.pos
    from unnest(p_ids) with ordinality as o(id, pos)
   where p.id = o.id;
end;
$$;

revoke execute on function public.set_project_relations(uuid, jsonb, uuid[]) from public, anon;
revoke execute on function public.reorder_projects(uuid[]) from public, anon;
grant execute on function public.set_project_relations(uuid, jsonb, uuid[]) to authenticated;
grant execute on function public.reorder_projects(uuid[]) to authenticated;
