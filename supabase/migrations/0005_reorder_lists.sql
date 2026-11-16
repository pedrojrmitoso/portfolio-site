-- Reordenar tecnologias, links e experiências por arrastar e soltar (mesma ideia de reorder_projects):
-- posição na lista = sort_order, tudo numa única transação.
create or replace function public.reorder_technologies(p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  update public.technologies t
     set sort_order = o.pos
    from unnest(p_ids) with ordinality as o(id, pos)
   where t.id = o.id;
end;
$$;

create or replace function public.reorder_links(p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  update public.social_links l
     set sort_order = o.pos
    from unnest(p_ids) with ordinality as o(id, pos)
   where l.id = o.id;
end;
$$;

create or replace function public.reorder_experiences(p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  update public.experiences e
     set sort_order = o.pos
    from unnest(p_ids) with ordinality as o(id, pos)
   where e.id = o.id;
end;
$$;

revoke execute on function public.reorder_technologies(uuid[]) from public, anon;
revoke execute on function public.reorder_links(uuid[]) from public, anon;
revoke execute on function public.reorder_experiences(uuid[]) from public, anon;
grant execute on function public.reorder_technologies(uuid[]) to authenticated;
grant execute on function public.reorder_links(uuid[]) to authenticated;
grant execute on function public.reorder_experiences(uuid[]) to authenticated;
