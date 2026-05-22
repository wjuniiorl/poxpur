-- RPCs em public pra n8n usar node Supabase nativo no inbound.
-- Substituem a Edge Function whatsapp-inbound (lógica multi-step).
-- O node Supabase v1 chama RPCs via "tableId: rpc/<nome>" + operation 'create' (POST).

create or replace function public.poxpur_inbound_message(
  p_from_phone text,
  p_from_name text default null,
  p_text text default '',
  p_type text default 'texto',
  p_whatsapp_message_id text default null,
  p_media_url text default null,
  p_media_mime text default null,
  p_media_filename text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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
      return jsonb_build_object('conversationId', v_conv_id, 'messageId', v_existing_msg, 'deduplicated', true);
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

  return jsonb_build_object('conversationId', v_conv_id, 'messageId', v_msg_id);
end;
$$;

create or replace function public.poxpur_inbound_reaction(
  p_from_phone text,
  p_reacted_message_id text,
  p_emoji text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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

  return jsonb_build_object('reactedMessageId', p_reacted_message_id);
end;
$$;

grant execute on function public.poxpur_inbound_message(text, text, text, text, text, text, text, text) to anon, authenticated, service_role;
grant execute on function public.poxpur_inbound_reaction(text, text, text) to anon, authenticated, service_role;
