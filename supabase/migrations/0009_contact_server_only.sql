-- Contato só pelo servidor. Antes, anon podia chamar submit_contact_message direto
-- (a chave publicável vai no navegador), pulando o anti-spam do Next e passando
-- p_ip_hash nulo ou inventado para fugir do limite por IP e esgotar a cota global.
-- Agora só a chave secreta (service_role), usada na server action, executa a função.

revoke execute on function public.submit_contact_message(text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.submit_contact_message(text, text, text, text, text, text)
  to service_role;
