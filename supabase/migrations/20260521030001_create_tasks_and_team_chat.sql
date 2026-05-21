-- Onda 4: tasks + internal team chat (canais públicos + DMs + mensagens)

do $$ begin
  if not exists (select 1 from pg_type where typname = 'task_status' and typnamespace = 'poxpur'::regnamespace) then
    create type poxpur.task_status as enum ('a_fazer', 'em_andamento', 'concluido', 'cancelado');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'task_priority' and typnamespace = 'poxpur'::regnamespace) then
    create type poxpur.task_priority as enum ('baixa', 'media', 'alta', 'urgente');
  end if;
end $$;

create table if not exists poxpur.tasks (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  status poxpur.task_status not null default 'a_fazer',
  prioridade poxpur.task_priority not null default 'media',
  assigned_to uuid references auth.users(id) on delete set null,
  criado_por uuid not null references auth.users(id) on delete cascade,
  prazo date,
  vinculo_order_id uuid references poxpur.orders(id) on delete set null,
  vinculo_customer_id uuid references poxpur.customers(id) on delete set null,
  concluido_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists tasks_assigned_idx on poxpur.tasks(assigned_to) where status != 'concluido';
create index if not exists tasks_status_idx on poxpur.tasks(status);
create index if not exists tasks_prazo_idx on poxpur.tasks(prazo) where status != 'concluido';
create index if not exists tasks_criado_por_idx on poxpur.tasks(criado_por);

drop trigger if exists tasks_set_atualizado_em on poxpur.tasks;
create trigger tasks_set_atualizado_em
  before update on poxpur.tasks
  for each row execute function poxpur.tg_set_atualizado_em();

create or replace function poxpur.tg_task_set_concluido_em()
returns trigger language plpgsql as $$
begin
  if new.status = 'concluido' and (old.status is null or old.status != 'concluido') then
    new.concluido_em = now();
  elsif new.status != 'concluido' then
    new.concluido_em = null;
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_set_concluido_em on poxpur.tasks;
create trigger tasks_set_concluido_em
  before insert or update of status on poxpur.tasks
  for each row execute function poxpur.tg_task_set_concluido_em();

-- Trigger: notificar responsável quando atribuída
create or replace function poxpur.tg_notify_task_assignee()
returns trigger language plpgsql as $$
declare
  v_criador_nome text;
begin
  if tg_op = 'UPDATE' and new.assigned_to is not distinct from old.assigned_to then
    return new;
  end if;
  if new.assigned_to is not null and new.assigned_to != new.criado_por then
    select nome into v_criador_nome from poxpur.profiles where id = new.criado_por;
    insert into poxpur.notifications (user_id, tipo, titulo, mensagem, link, payload)
    values (
      new.assigned_to, 'pedido_pendente_aprovacao',
      'Nova tarefa atribuída',
      coalesce(v_criador_nome, 'Alguém') || ' atribuiu a tarefa "' || new.titulo || '" a você',
      '/tasks?t=' || new.id::text,
      jsonb_build_object('task_id', new.id, 'task_titulo', new.titulo, 'prioridade', new.prioridade)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_notify_assignee on poxpur.tasks;
create trigger tasks_notify_assignee
  after insert or update of assigned_to on poxpur.tasks
  for each row execute function poxpur.tg_notify_task_assignee();

alter table poxpur.tasks enable row level security;

drop policy if exists "tasks_select_involved" on poxpur.tasks;
create policy "tasks_select_involved" on poxpur.tasks for select to authenticated
  using (criado_por = auth.uid() or assigned_to = auth.uid() or poxpur.is_admin());

drop policy if exists "tasks_insert_authenticated" on poxpur.tasks;
create policy "tasks_insert_authenticated" on poxpur.tasks for insert to authenticated
  with check (criado_por = auth.uid());

drop policy if exists "tasks_update_involved" on poxpur.tasks;
create policy "tasks_update_involved" on poxpur.tasks for update to authenticated
  using (criado_por = auth.uid() or assigned_to = auth.uid() or poxpur.is_admin())
  with check (criado_por = auth.uid() or assigned_to = auth.uid() or poxpur.is_admin());

drop policy if exists "tasks_delete_creator_or_admin" on poxpur.tasks;
create policy "tasks_delete_creator_or_admin" on poxpur.tasks for delete to authenticated
  using (criado_por = auth.uid() or poxpur.is_admin());

grant select, insert, update, delete on poxpur.tasks to authenticated;

-- Team chat
do $$ begin
  if not exists (select 1 from pg_type where typname = 'channel_type' and typnamespace = 'poxpur'::regnamespace) then
    create type poxpur.channel_type as enum ('publico', 'dm');
  end if;
end $$;

create table if not exists poxpur.internal_channels (
  id uuid primary key default gen_random_uuid(),
  nome text,
  tipo poxpur.channel_type not null default 'publico',
  criado_por uuid not null references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now()
);

create index if not exists internal_channels_tipo_idx on poxpur.internal_channels(tipo);

create table if not exists poxpur.internal_channel_members (
  channel_id uuid not null references poxpur.internal_channels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (channel_id, user_id)
);

create index if not exists internal_channel_members_user_idx on poxpur.internal_channel_members(user_id);

create table if not exists poxpur.internal_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references poxpur.internal_channels(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  conteudo text not null,
  mencoes uuid[] not null default '{}',
  anexo_url text,
  metadata jsonb,
  criado_em timestamptz not null default now()
);

create index if not exists internal_messages_channel_idx on poxpur.internal_messages(channel_id, criado_em);
create index if not exists internal_messages_sender_idx on poxpur.internal_messages(sender_id);
create index if not exists internal_messages_mencoes_idx on poxpur.internal_messages using gin (mencoes);

alter table poxpur.internal_channels enable row level security;

drop policy if exists "channels_select_member_or_public" on poxpur.internal_channels;
create policy "channels_select_member_or_public" on poxpur.internal_channels for select to authenticated
  using (tipo = 'publico' or exists (
    select 1 from poxpur.internal_channel_members m where m.channel_id = id and m.user_id = auth.uid()
  ));

drop policy if exists "channels_insert_authenticated" on poxpur.internal_channels;
create policy "channels_insert_authenticated" on poxpur.internal_channels for insert to authenticated
  with check (criado_por = auth.uid());

drop policy if exists "channels_update_admin" on poxpur.internal_channels;
create policy "channels_update_admin" on poxpur.internal_channels for update to authenticated
  using (poxpur.is_admin() or criado_por = auth.uid());

drop policy if exists "channels_delete_admin" on poxpur.internal_channels;
create policy "channels_delete_admin" on poxpur.internal_channels for delete to authenticated
  using (poxpur.is_admin());

alter table poxpur.internal_channel_members enable row level security;

drop policy if exists "channel_members_select_authenticated" on poxpur.internal_channel_members;
create policy "channel_members_select_authenticated" on poxpur.internal_channel_members for select to authenticated using (true);

drop policy if exists "channel_members_insert_authenticated" on poxpur.internal_channel_members;
create policy "channel_members_insert_authenticated" on poxpur.internal_channel_members for insert to authenticated with check (true);

drop policy if exists "channel_members_delete_self_or_admin" on poxpur.internal_channel_members;
create policy "channel_members_delete_self_or_admin" on poxpur.internal_channel_members for delete to authenticated
  using (user_id = auth.uid() or poxpur.is_admin());

alter table poxpur.internal_messages enable row level security;

drop policy if exists "internal_messages_select_via_channel" on poxpur.internal_messages;
create policy "internal_messages_select_via_channel" on poxpur.internal_messages for select to authenticated
  using (exists (
    select 1 from poxpur.internal_channels c
    where c.id = channel_id
    and (c.tipo = 'publico' or exists (
      select 1 from poxpur.internal_channel_members m where m.channel_id = c.id and m.user_id = auth.uid()
    ))
  ));

drop policy if exists "internal_messages_insert_via_channel" on poxpur.internal_messages;
create policy "internal_messages_insert_via_channel" on poxpur.internal_messages for insert to authenticated
  with check (sender_id = auth.uid() and exists (
    select 1 from poxpur.internal_channels c
    where c.id = channel_id
    and (c.tipo = 'publico' or exists (
      select 1 from poxpur.internal_channel_members m where m.channel_id = c.id and m.user_id = auth.uid()
    ))
  ));

grant select, insert, update, delete on poxpur.internal_channels to authenticated;
grant select, insert, delete on poxpur.internal_channel_members to authenticated;
grant select, insert, update, delete on poxpur.internal_messages to authenticated;

alter publication supabase_realtime add table poxpur.tasks;
alter publication supabase_realtime add table poxpur.internal_messages;
