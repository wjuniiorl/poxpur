create table if not exists poxpur.customers (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text,
  email text,
  cidade text,
  estado text,
  tags text[] not null default '{}',
  observacoes text,
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists customers_nome_idx on poxpur.customers using gin (to_tsvector('portuguese', nome));
create index if not exists customers_telefone_idx on poxpur.customers(telefone);
create index if not exists customers_criado_em_idx on poxpur.customers(criado_em desc);

drop trigger if exists customers_set_atualizado_em on poxpur.customers;
create trigger customers_set_atualizado_em
  before update on poxpur.customers
  for each row execute function poxpur.tg_set_atualizado_em();

alter table poxpur.customers enable row level security;

drop policy if exists "customers_select_authenticated" on poxpur.customers;
create policy "customers_select_authenticated"
  on poxpur.customers for select to authenticated
  using (true);

drop policy if exists "customers_insert_authenticated" on poxpur.customers;
create policy "customers_insert_authenticated"
  on poxpur.customers for insert to authenticated
  with check (auth.uid() = criado_por);

drop policy if exists "customers_update_creator_or_admin" on poxpur.customers;
create policy "customers_update_creator_or_admin"
  on poxpur.customers for update to authenticated
  using (auth.uid() = criado_por or poxpur.is_admin())
  with check (auth.uid() = criado_por or poxpur.is_admin());

drop policy if exists "customers_delete_admin" on poxpur.customers;
create policy "customers_delete_admin"
  on poxpur.customers for delete to authenticated
  using (poxpur.is_admin());

grant select, insert, update, delete on poxpur.customers to authenticated;
