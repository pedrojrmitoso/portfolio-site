-- 1. Ícone próprio das tecnologias (imagem enviada pelo painel).
--    Tem prioridade sobre `icon` (catálogo); sem nenhum dos dois, o site mostra a inicial.
alter table public.technologies add column icon_url text;
alter table public.technologies
  add constraint technologies_icon_url_safe check (icon_url is null or icon_url ~* '^https://');

-- 2. Lixeira das mensagens: excluir só marca deleted_at; apagar de vez é outra ação.
alter table public.contact_messages add column deleted_at timestamptz;
create index contact_messages_trash_idx on public.contact_messages (deleted_at)
  where deleted_at is not null;

-- 3. Esvazia sozinha: todo dia apaga o que está na lixeira há mais de 30 dias.
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'purge-contact-trash',
  '17 3 * * *',
  $$delete from public.contact_messages where deleted_at < now() - interval '30 days'$$
);
