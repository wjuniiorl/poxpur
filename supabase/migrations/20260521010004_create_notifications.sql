do $$ begin
  if not exists (select 1 from pg_type where typname = 'notification_type' and typnamespace = 'poxpur'::regnamespace) then
    create type poxpur.notification_type as enum (
      'pedido_pendente_aprovacao', 'pedido_aprovado', 'pedido_recusado',
      'pedido_aguardando_fabrica', 'pedido_enviado', 'pedido_concluido'
    );
  end if;
end $$;

create table if not exists poxpur.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo poxpur.notification_type not null,
  titulo text not null,
  mensagem text not null,
  link text,
  payload jsonb,
  lida boolean not null default false,
  lida_em timestamptz,
  criado_em timestamptz not null default now()
);

create index if not exists notifications_user_idx on poxpur.notifications(user_id);
create index if not exists notifications_unread_idx on poxpur.notifications(user_id, criado_em desc) where lida = false;
create index if not exists notifications_criado_em_idx on poxpur.notifications(criado_em desc);

alter table poxpur.notifications enable row level security;

drop policy if exists "notifications_select_self" on poxpur.notifications;
create policy "notifications_select_self"
  on poxpur.notifications for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "notifications_update_self" on poxpur.notifications;
create policy "notifications_update_self"
  on poxpur.notifications for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "notifications_insert_service" on poxpur.notifications;
create policy "notifications_insert_service"
  on poxpur.notifications for insert to authenticated
  with check (true);

-- Trigger: notificar admins ao criar pedido
create or replace function poxpur.tg_notify_admins_on_new_order()
returns trigger language plpgsql as $$
declare
  v_admin_id uuid;
  v_seller_name text;
  v_customer_name text;
begin
  if new.status = 'pendente_aprovacao' then
    select nome into v_seller_name from poxpur.profiles where id = new.seller_id;
    select nome into v_customer_name from poxpur.customers where id = new.customer_id;
    for v_admin_id in
      select id from poxpur.profiles where role = 'admin' and ativo = true
    loop
      insert into poxpur.notifications (user_id, tipo, titulo, mensagem, link, payload)
      values (
        v_admin_id, 'pedido_pendente_aprovacao',
        'Novo pedido aguardando aprovação',
        coalesce(v_seller_name, 'Vendedor') || ' criou pedido #' || new.numero || ' para ' || coalesce(v_customer_name, 'cliente'),
        '/orders/' || new.id::text,
        jsonb_build_object('order_id', new.id, 'order_numero', new.numero, 'seller_id', new.seller_id, 'customer_id', new.customer_id, 'valor_total', new.valor_total)
      );
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_notify_admins on poxpur.orders;
create trigger orders_notify_admins
  after insert on poxpur.orders
  for each row execute function poxpur.tg_notify_admins_on_new_order();

-- Trigger: notificar vendedor em mudança de status
create or replace function poxpur.tg_notify_seller_on_status_change()
returns trigger language plpgsql as $$
declare
  v_titulo text;
  v_mensagem text;
  v_tipo poxpur.notification_type;
begin
  if new.status = old.status then return new; end if;

  if new.status = 'aprovado' then
    v_tipo := 'pedido_aprovado';
    v_titulo := 'Pedido #' || new.numero || ' aprovado';
    v_mensagem := 'Seu pedido foi aprovado pelo administrador.';
  elsif new.status = 'recusado' then
    v_tipo := 'pedido_recusado';
    v_titulo := 'Pedido #' || new.numero || ' recusado';
    v_mensagem := 'Seu pedido foi recusado. Motivo: ' || coalesce(new.motivo_recusa, 'não informado');
  elsif new.status = 'aguardando_fabrica' then
    v_tipo := 'pedido_aguardando_fabrica';
    v_titulo := 'Pedido #' || new.numero || ' aguarda fábrica';
    v_mensagem := 'Pedido aprovado mas sem estoque — aguardando fabricação.';
  elsif new.status = 'enviado' then
    v_tipo := 'pedido_enviado';
    v_titulo := 'Pedido #' || new.numero || ' enviado';
    v_mensagem := 'O pedido foi marcado como enviado.';
  elsif new.status = 'concluido' then
    v_tipo := 'pedido_concluido';
    v_titulo := 'Pedido #' || new.numero || ' concluído';
    v_mensagem := 'O pedido foi concluído.';
  else
    return new;
  end if;

  insert into poxpur.notifications (user_id, tipo, titulo, mensagem, link, payload)
  values (
    new.seller_id, v_tipo, v_titulo, v_mensagem,
    '/orders/' || new.id::text,
    jsonb_build_object('order_id', new.id, 'order_numero', new.numero, 'new_status', new.status)
  );
  return new;
end;
$$;

drop trigger if exists orders_notify_seller on poxpur.orders;
create trigger orders_notify_seller
  after update on poxpur.orders
  for each row execute function poxpur.tg_notify_seller_on_status_change();

grant select, insert, update on poxpur.notifications to authenticated;
