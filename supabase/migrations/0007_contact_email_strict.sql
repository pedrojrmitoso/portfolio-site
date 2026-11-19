-- E-mail do contato mais rígido: sem ?, &, =, # etc. Antes, um endereço como
-- a@b.com?cc=x@y.com&body=... passava e injetava parâmetros no "Responder" (mailto) do painel.
-- Mesmo regex do Next (src/app/(site)/[lang]/actions.ts). O valor já chega em minúsculas.

alter table public.contact_messages drop constraint contact_messages_email_check;

alter table public.contact_messages add constraint contact_messages_email_check check (
  char_length(email) between 3 and 200
  and email ~ '^[a-z0-9._+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$'
);
