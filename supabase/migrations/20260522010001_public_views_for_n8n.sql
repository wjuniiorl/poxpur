-- Views em public que espelham tabelas poxpur, pra n8n usar com node Supabase nativo.
-- O node `n8n-nodes-base.supabase` v1 é hardcoded pro schema `public` — não suporta
-- schema custom. Solução: views com security_invoker=true herdam a RLS do schema poxpur,
-- sem bypassar segurança.

create or replace view public.poxpur_messages
with (security_invoker = true) as
select
  id, conversation_id, sender_type, sender_id, tipo, conteudo, anexo_url,
  media_mime, media_filename, whatsapp_message_id, metadata, reactions, lida, criado_em
from poxpur.messages;

create or replace view public.poxpur_orders
with (security_invoker = true) as
select
  id, numero, customer_id, seller_id, status,
  valor_subtotal, valor_desconto, valor_frete, valor_total,
  forma_pagamento, prazo_entrega, observacoes, motivo_recusa,
  aprovado_por, aprovado_em, criado_em, atualizado_em
from poxpur.orders;

create or replace view public.poxpur_company_settings
with (security_invoker = true) as
select
  id, singleton, razao_social, nome_fantasia, cnpj, inscricao_estadual,
  endereco, cidade, estado, cep, telefone, email, logo_url,
  whatsapp_phone, whatsapp_token_configured, n8n_webhook_url,
  recebe_resumo_diario, hora_resumo_diario, criado_em, atualizado_em
from poxpur.company_settings;

grant select on public.poxpur_messages, public.poxpur_orders, public.poxpur_company_settings
  to anon, authenticated, service_role;
grant update on public.poxpur_messages to authenticated, service_role;
