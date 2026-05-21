create table if not exists poxpur.products (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null,
  nome text not null,
  descricao text,
  preco numeric(12,2) not null check (preco >= 0),
  estoque integer not null default 0 check (estoque >= 0),
  categoria text,
  foto_url text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists products_sku_idx on poxpur.products(sku);
create index if not exists products_ativo_idx on poxpur.products(ativo);
create index if not exists products_categoria_idx on poxpur.products(categoria) where ativo = true;

drop trigger if exists products_set_atualizado_em on poxpur.products;
create trigger products_set_atualizado_em
  before update on poxpur.products
  for each row execute function poxpur.tg_set_atualizado_em();

alter table poxpur.products enable row level security;

drop policy if exists "products_select_authenticated" on poxpur.products;
create policy "products_select_authenticated"
  on poxpur.products for select to authenticated
  using (true);

drop policy if exists "products_admin_all" on poxpur.products;
create policy "products_admin_all"
  on poxpur.products for all to authenticated
  using (poxpur.is_admin())
  with check (poxpur.is_admin());

grant select on poxpur.products to authenticated;
grant insert, update, delete on poxpur.products to authenticated;
