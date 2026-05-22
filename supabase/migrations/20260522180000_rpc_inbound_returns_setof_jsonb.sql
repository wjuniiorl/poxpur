-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- n8n Supabase node faz .forEach() na resposta — espera array.
-- Trocando "returns jsonb" (objeto) por "returns setof jsonb" (array).
-- Body lógico inalterado; apenas usa "return next ... ; return;" em vez de "return ...".
-- Fix do erro: "createdRows.forEach is not a function" no node Supabase ao chamar
-- esses RPCs via rpc/poxpur_inbound_* com Operation: Create.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

drop function if exists public.poxpur_inbound_message(text, text, text, text, text, text, text, text);
drop function if exists public.poxpur_inbound_reaction(text, text, text);

create or replace function public.poxpur_inbound_message(
  p_from_phone text,
  p_from_name text default null,
  p_text text default '',
  p_type text default 'texto',
  p_whatsapp_message_id text default null,
  p_media_url text default null,
  p_media_mime text default null,
  p_media_filename text default null
)
returns setof jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_phone text;
  v_digits text;
  v_conv_id uuid;
  v_msg_id uuid;
  v_customer_id uuid;
  v_customer_nome text;
  v_existing_msg uuid;
  v_text text;
begin
  v_digits := regexp_replace(coalesce(p_from_phone, ''), '\D', '', 'g');
  if length(v_digits) in (10, 11) then v_phone := '+55' || v_digits;
  elsif length(v_digits) >= 10 then v_phone := '+' || v_digits;
  else raise exception 'phone invalido: %', p_from_phone;
  end if;

  v_text := coalesce(nullif(p_text, ''), case when p_media_url is not null then '[' || p_type || ']' else null end);
  if v_text is null then raise exception 'text ou mediaUrl obrigatorios'; end if;

  if p_whatsapp_message_id is not null then
    select id, conversation_id into v_existing_msg, v_conv_id
    from poxpur.messages where whatsapp_message_id = p_whatsapp_message_id limit 1;
    if found then
      return next jsonb_build_object('conversationId', v_conv_id, 'messageId', v_existing_msg, 'deduplicated', true);
      return;
    end if;
  end if;

  select id into v_conv_id
  from poxpur.conversations
  where customer_phone = v_phone and status = 'aberta'
  order by ultima_mensagem_em desc nulls last limit 1;

  if v_conv_id is null then
    select id, nome into v_customer_id, v_customer_nome
    from poxpur.customers where telefone = v_phone limit 1;

    insert into poxpur.conversations (customer_id, customer_phone, customer_nome_snapshot, canal, status, assigned_to)
    values (v_customer_id, v_phone, coalesce(v_customer_nome, p_from_name), 'whatsapp', 'aberta', null)
    returning id into v_conv_id;
  end if;

  insert into poxpur.messages (
    conversation_id, sender_type, sender_id, tipo, conteudo,
    anexo_url, media_mime, media_filename, whatsapp_message_id, metadata, lida
  )
  values (
    v_conv_id, 'cliente', null, p_type::poxpur.message_type, v_text,
    p_media_url, p_media_mime, p_media_filename, p_whatsapp_message_id,
    jsonb_build_object('source', 'rpc-n8n'), false
  )
  returning id into v_msg_id;

  return next jsonb_build_object('conversationId', v_conv_id, 'messageId', v_msg_id);
  return;
end;
$function$;

create or replace function public.poxpur_inbound_reaction(
  p_from_phone text,
  p_reacted_message_id text,
  p_emoji text
)
returns setof jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_digits text;
  v_phone text;
  v_by text;
begin
  v_digits := regexp_replace(coalesce(p_from_phone, ''), '\D', '', 'g');
  if length(v_digits) in (10, 11) then v_phone := '+55' || v_digits;
  elsif length(v_digits) >= 10 then v_phone := '+' || v_digits;
  else v_phone := coalesce(p_from_phone, 'unknown');
  end if;

  v_by := 'cliente:' || v_phone;
  perform poxpur.upsert_message_reaction(p_reacted_message_id, v_by, p_emoji);

  return next jsonb_build_object('reactedMessageId', p_reacted_message_id);
  return;
end;
$function$;

-- Re-aplica hardening (DROP limpou grants): execute apenas service_role
revoke execute on function public.poxpur_inbound_message(text, text, text, text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.poxpur_inbound_reaction(text, text, text) from public, anon, authenticated;
grant execute on function public.poxpur_inbound_message(text, text, text, text, text, text, text, text) to service_role;
grant execute on function public.poxpur_inbound_reaction(text, text, text) to service_role;
