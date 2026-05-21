-- Schema isolado para o Poxpur Sales Hub (separa do app que já existe em public)
create schema if not exists poxpur;

-- Grants básicos para as roles do Supabase
grant usage on schema poxpur to anon, authenticated, service_role;
grant all on all tables in schema poxpur to authenticated, service_role;
grant all on all sequences in schema poxpur to authenticated, service_role;
grant execute on all functions in schema poxpur to authenticated, service_role;

-- Default privileges para tabelas, sequences e functions futuras
alter default privileges in schema poxpur
  grant all on tables to authenticated, service_role;
alter default privileges in schema poxpur
  grant all on sequences to authenticated, service_role;
alter default privileges in schema poxpur
  grant execute on functions to authenticated, service_role;

-- Enum de papéis do sistema (só admin e vendedor na Onda 1; pode estender depois)
do $$ begin
  if not exists (select 1 from pg_type where typname = 'user_role' and typnamespace = 'poxpur'::regnamespace) then
    create type poxpur.user_role as enum ('admin', 'vendedor');
  end if;
end $$;

-- Enum de presença (preparado para o chat interno da Onda 4)
do $$ begin
  if not exists (select 1 from pg_type where typname = 'presence_status' and typnamespace = 'poxpur'::regnamespace) then
    create type poxpur.presence_status as enum ('online', 'ocupado', 'ausente', 'offline');
  end if;
end $$;
