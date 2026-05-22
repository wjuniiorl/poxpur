-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- View espelho de poxpur.messages enriquecida com nome do sender.
-- Usada pelo n8n outbound: SELECT por id → pega sender_nome → prefixa
-- antes de chamar Evolution, então o cliente vê "Alex Pessin:\n<msg>" no WhatsApp.
-- security_invoker = true herda RLS de poxpur (não bypassa).
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

create or replace view public.poxpur_messages_with_sender
with (security_invoker = true) as
select
  m.id,
  m.conversation_id,
  m.sender_type,
  m.sender_id,
  m.tipo,
  m.conteudo,
  m.anexo_url,
  m.media_mime,
  m.media_filename,
  m.metadata,
  m.lida,
  m.whatsapp_message_id,
  m.criado_em,
  p.nome as sender_nome
from poxpur.messages m
left join poxpur.profiles p on p.id = m.sender_id;

grant select on public.poxpur_messages_with_sender to anon, authenticated, service_role;
