-- Onda 3: conversations + messages (Chat WhatsApp)
do $$ begin
  if not exists (select 1 from pg_type where typname = 'conversation_channel' and typnamespace = 'poxpur'::regnamespace) then
    create type poxpur.conversation_channel as enum ('whatsapp', 'manual');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'conversation_status' and typnamespace = 'poxpur'::regnamespace) then
    create type poxpur.conversation_status as enum ('aberta', 'arquivada');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'message_sender_type' and typnamespace = 'poxpur'::regnamespace) then
    create type poxpur.message_sender_type as enum ('cliente', 'vendedor', 'sistema');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'message_type' and typnamespace = 'poxpur'::regnamespace) then
    create type poxpur.message_type as enum ('texto', 'imagem', 'audio', 'documento', 'localizacao', 'template');
  end if;
end $$;

create table if not exists poxpur.conversations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references poxpur.customers(id) on delete set null,
  customer_phone text,
  customer_nome_snapshot text,
  canal poxpur.conversation_channel not null default 'whatsapp',
  status poxpur.conversation_status not null default 'aberta',
  assigned_to uuid references auth.users(id) on delete set null,
  ultima_mensagem_em timestamptz,
  ultima_mensagem_preview text,
  nao_lidas integer not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists conversations_assigned_idx on poxpur.conversations(assigned_to) where status = 'aberta';
create index if not exists conversations_status_idx on poxpur.conversations(status);
create index if not exists conversations_customer_idx on poxpur.conversations(customer_id);
create index if not exists conversations_phone_idx on poxpur.conversations(customer_phone);
create index if not exists conversations_ultima_msg_idx on poxpur.conversations(ultima_mensagem_em desc nulls last);

drop trigger if exists conversations_set_atualizado_em on poxpur.conversations;
create trigger conversations_set_atualizado_em
  before update on poxpur.conversations
  for each row execute function poxpur.tg_set_atualizado_em();

create table if not exists poxpur.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references poxpur.conversations(id) on delete cascade,
  sender_type poxpur.message_sender_type not null,
  sender_id uuid references auth.users(id) on delete set null,
  tipo poxpur.message_type not null default 'texto',
  conteudo text not null,
  anexo_url text,
  metadata jsonb,
  whatsapp_message_id text unique,
  lida boolean not null default false,
  criado_em timestamptz not null default now()
);

create index if not exists messages_conversation_idx on poxpur.messages(conversation_id, criado_em);
create index if not exists messages_unread_idx on poxpur.messages(conversation_id) where lida = false and sender_type = 'cliente';

create or replace function poxpur.tg_update_conversation_on_message()
returns trigger language plpgsql as $$
begin
  update poxpur.conversations
  set
    ultima_mensagem_em = new.criado_em,
    ultima_mensagem_preview = substring(new.conteudo from 1 for 100),
    nao_lidas = case
      when new.sender_type = 'cliente' and not new.lida then nao_lidas + 1
      else nao_lidas
    end,
    atualizado_em = now()
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists messages_update_conversation on poxpur.messages;
create trigger messages_update_conversation
  after insert on poxpur.messages
  for each row execute function poxpur.tg_update_conversation_on_message();

alter table poxpur.conversations enable row level security;

drop policy if exists "conversations_select_assigned_or_admin" on poxpur.conversations;
create policy "conversations_select_assigned_or_admin"
  on poxpur.conversations for select to authenticated
  using (assigned_to = auth.uid() or assigned_to is null or poxpur.is_admin());

drop policy if exists "conversations_insert_authenticated" on poxpur.conversations;
create policy "conversations_insert_authenticated"
  on poxpur.conversations for insert to authenticated
  with check (true);

drop policy if exists "conversations_update_assigned_or_admin" on poxpur.conversations;
create policy "conversations_update_assigned_or_admin"
  on poxpur.conversations for update to authenticated
  using (assigned_to = auth.uid() or assigned_to is null or poxpur.is_admin())
  with check (assigned_to = auth.uid() or poxpur.is_admin());

drop policy if exists "conversations_delete_admin" on poxpur.conversations;
create policy "conversations_delete_admin"
  on poxpur.conversations for delete to authenticated
  using (poxpur.is_admin());

alter table poxpur.messages enable row level security;

drop policy if exists "messages_select_via_conversation" on poxpur.messages;
create policy "messages_select_via_conversation"
  on poxpur.messages for select to authenticated
  using (exists (
    select 1 from poxpur.conversations c
    where c.id = conversation_id
    and (c.assigned_to = auth.uid() or c.assigned_to is null or poxpur.is_admin())
  ));

drop policy if exists "messages_insert_authenticated" on poxpur.messages;
create policy "messages_insert_authenticated"
  on poxpur.messages for insert to authenticated
  with check (
    exists (
      select 1 from poxpur.conversations c
      where c.id = conversation_id
      and (c.assigned_to = auth.uid() or c.assigned_to is null or poxpur.is_admin())
    )
  );

drop policy if exists "messages_update_via_conversation" on poxpur.messages;
create policy "messages_update_via_conversation"
  on poxpur.messages for update to authenticated
  using (exists (
    select 1 from poxpur.conversations c
    where c.id = conversation_id
    and (c.assigned_to = auth.uid() or c.assigned_to is null or poxpur.is_admin())
  ));

grant select, insert, update, delete on poxpur.conversations to authenticated;
grant select, insert, update on poxpur.messages to authenticated;
alter publication supabase_realtime add table poxpur.conversations;
alter publication supabase_realtime add table poxpur.messages;
