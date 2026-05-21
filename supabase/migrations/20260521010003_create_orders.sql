-- Enums
do $$ begin
  if not exists (select 1 from pg_type where typname = 'order_status' and typnamespace = 'poxpur'::regnamespace) then
    create type poxpur.order_status as enum (
      'pendente_aprovacao', 'aprovado', 'recusado',
      'aguardando_fabrica', 'enviado', 'concluido', 'cancelado'
    );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'payment_method' and typnamespace = 'poxpur'::regnamespace) then
    create type poxpur.payment_method as enum (
      'pix', 'boleto', 'cartao', 'transferencia', 'a_combinar'
    );
  end if;
end $$;

create sequence if not exists poxpur.orders_numero_seq start 1000;

create table if not exists poxpur.orders (
  id uuid primary key default gen_random_uuid(),
  numero integer not null unique default nextval('poxpur.orders_numero_seq'),
  customer_id uuid not null references poxpur.customers(id) on delete restrict,
  seller_id uuid not null references auth.users(id) on delete restrict,
  status poxpur.order_status not null default 'pendente_aprovacao',
  valor_subtotal numeric(12,2) not null default 0,
  valor_desconto numeric(12,2) not null default 0,
  valor_frete numeric(12,2) not null default 0,
  valor_total numeric(12,2) not null default 0,
  forma_pagamento poxpur.payment_method,
  prazo_entrega date,
  observacoes text,
  motivo_recusa text,
  aprovado_por uuid references auth.users(id) on delete set null,
  aprovado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists orders_status_idx on poxpur.orders(status);
create index if not exists orders_seller_idx on poxpur.orders(seller_id);
create index if not exists orders_customer_idx on poxpur.orders(customer_id);
create index if not exists orders_criado_em_idx on poxpur.orders(criado_em desc);
create index if not exists orders_numero_idx on poxpur.orders(numero);

drop trigger if exists orders_set_atualizado_em on poxpur.orders;
create trigger orders_set_atualizado_em
  before update on poxpur.orders
  for each row execute function poxpur.tg_set_atualizado_em();

create table if not exists poxpur.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references poxpur.orders(id) on delete cascade,
  product_id uuid not null references poxpur.products(id) on delete restrict,
  quantidade integer not null check (quantidade > 0),
  valor_unitario numeric(12,2) not null check (valor_unitario >= 0),
  valor_total numeric(12,2) generated always as (quantidade * valor_unitario) stored,
  criado_em timestamptz not null default now()
);

create index if not exists order_items_order_idx on poxpur.order_items(order_id);
create index if not exists order_items_product_idx on poxpur.order_items(product_id);

-- Trigger: recalcular valor_subtotal e valor_total
create or replace function poxpur.tg_recalc_order_totals()
returns trigger language plpgsql as $$
declare
  v_order_id uuid;
  v_subtotal numeric(12,2);
begin
  v_order_id := coalesce(new.order_id, old.order_id);
  select coalesce(sum(valor_total), 0) into v_subtotal
  from poxpur.order_items where order_id = v_order_id;
  update poxpur.orders
  set valor_subtotal = v_subtotal,
      valor_total = v_subtotal - coalesce(valor_desconto, 0) + coalesce(valor_frete, 0)
  where id = v_order_id;
  return null;
end;
$$;

drop trigger if exists order_items_recalc on poxpur.order_items;
create trigger order_items_recalc
  after insert or update or delete on poxpur.order_items
  for each row execute function poxpur.tg_recalc_order_totals();

-- RLS orders
alter table poxpur.orders enable row level security;

drop policy if exists "orders_select_self_or_admin" on poxpur.orders;
create policy "orders_select_self_or_admin"
  on poxpur.orders for select to authenticated
  using (seller_id = auth.uid() or poxpur.is_admin());

drop policy if exists "orders_insert_self" on poxpur.orders;
create policy "orders_insert_self"
  on poxpur.orders for insert to authenticated
  with check (seller_id = auth.uid());

drop policy if exists "orders_update_pending_self_or_admin" on poxpur.orders;
create policy "orders_update_pending_self_or_admin"
  on poxpur.orders for update to authenticated
  using (poxpur.is_admin() or (seller_id = auth.uid() and status = 'pendente_aprovacao'))
  with check (poxpur.is_admin() or (seller_id = auth.uid() and status = 'pendente_aprovacao'));

drop policy if exists "orders_delete_admin" on poxpur.orders;
create policy "orders_delete_admin"
  on poxpur.orders for delete to authenticated
  using (poxpur.is_admin());

-- RLS order_items
alter table poxpur.order_items enable row level security;

drop policy if exists "order_items_select_via_order" on poxpur.order_items;
create policy "order_items_select_via_order"
  on poxpur.order_items for select to authenticated
  using (exists (
    select 1 from poxpur.orders o
    where o.id = order_id and (o.seller_id = auth.uid() or poxpur.is_admin())
  ));

drop policy if exists "order_items_modify_via_order" on poxpur.order_items;
create policy "order_items_modify_via_order"
  on poxpur.order_items for all to authenticated
  using (exists (
    select 1 from poxpur.orders o
    where o.id = order_id
    and (poxpur.is_admin() or (o.seller_id = auth.uid() and o.status = 'pendente_aprovacao'))
  ))
  with check (exists (
    select 1 from poxpur.orders o
    where o.id = order_id
    and (poxpur.is_admin() or (o.seller_id = auth.uid() and o.status = 'pendente_aprovacao'))
  ));

grant select, insert, update, delete on poxpur.orders to authenticated;
grant select, insert, update, delete on poxpur.order_items to authenticated;
grant usage, select on sequence poxpur.orders_numero_seq to authenticated;
