-- Texto sobre cada tecnologia (exibido no dialog da seção Stack). {"pt": "...", "en": "...", "fr": "..."}
alter table public.technologies
  add column description jsonb not null default '{}'::jsonb;
