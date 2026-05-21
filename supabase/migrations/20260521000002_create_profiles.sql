create table if not exists poxpur.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null,
  foto_url text,
  telefone text,
  role poxpur.user_role not null default 'vendedor',
  presence poxpur.presence_status not null default 'offline',
  ativo boolean not null default true,
  ultimo_acesso_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists profiles_role_idx on poxpur.profiles(role) where ativo = true;
create index if not exists profiles_ativo_idx on poxpur.profiles(ativo);

-- Função utilitária para RLS de outras tabelas (Ondas 2+)
create or replace function poxpur.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    (select role = 'admin' from poxpur.profiles where id = auth.uid()),
    false
  );
$$;

-- Trigger pra manter atualizado_em automático
create or replace function poxpur.tg_set_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end
$$;

drop trigger if exists profiles_set_atualizado_em on poxpur.profiles;
create trigger profiles_set_atualizado_em
  before update on poxpur.profiles
  for each row execute function poxpur.tg_set_atualizado_em();

-- RLS
alter table poxpur.profiles enable row level security;

drop policy if exists "profiles_select_authenticated" on poxpur.profiles;
create policy "profiles_select_authenticated"
  on poxpur.profiles for select to authenticated
  using (true);

drop policy if exists "profiles_update_self" on poxpur.profiles;
create policy "profiles_update_self"
  on poxpur.profiles for update to authenticated
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select role from poxpur.profiles where id = auth.uid())
  );

drop policy if exists "profiles_update_admin" on poxpur.profiles;
create policy "profiles_update_admin"
  on poxpur.profiles for update to authenticated
  using (poxpur.is_admin())
  with check (poxpur.is_admin());
