-- Mensagens do contato: anon não tem nada a fazer nesta tabela.
-- O RLS já escondia as linhas (anon recebia 200 com lista vazia), mas a permissão
-- de tabela vinha do padrão do Supabase. Sem ela, a resposta vira erro de permissão.
-- authenticated continua com acesso: as policies do painel filtram por is_admin().
-- A gravação pública passa pela função submit_contact_message (security definer, só service_role).

revoke all on table public.contact_messages from anon;
