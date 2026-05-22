---
name: new-migration
description: Cria nova migration Supabase no schema poxpur com template completo (RLS, índices, triggers, grants), aplica via MCP e versiona em supabase/migrations/. Use quando precisar adicionar tabela, alterar schema, criar RPC ou view.
---

# Nova migration Supabase (schema poxpur)

Ao invocar esse skill, peça ao usuário (se não estiver claro) o **tipo** de mudança:
- `table` — nova tabela
- `alter` — alterar tabela existente
- `view` — criar/atualizar view
- `rpc` — criar função RPC

## Convenções obrigatórias do projeto

- **Schema é `poxpur`**, não `public` (exceto views/RPCs pra n8n consumir via node Supabase nativo, que ficam em `public` apontando pra `poxpur`).
- Todo arquivo SQL vai em `supabase/migrations/` com nome `YYYYMMDDHHMMSS_<descricao>.sql` (timestamp UTC).
- Toda tabela nova deve ter:
  - PK uuid `default gen_random_uuid()`
  - `criado_em timestamptz not null default now()`
  - `atualizado_em timestamptz not null default now()` + trigger `tg_set_atualizado_em`
  - **RLS habilitada** desde o primeiro commit
  - Policies explícitas pra `select`, `insert`, `update`, `delete`
  - Grants pra `authenticated` e/ou `service_role`
- Aplicar via `mcp__plugin_supabase_supabase__apply_migration` (não via CLI local)
- Verificar via `mcp__plugin_supabase_supabase__execute_sql` que aplicou OK

## Template — Nova tabela

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_create_<table>.sql

create table if not exists poxpur.<table> (
  id uuid primary key default gen_random_uuid(),
  -- ... colunas ...
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists <table>_<col>_idx on poxpur.<table>(<col>);

drop trigger if exists <table>_set_atualizado_em on poxpur.<table>;
create trigger <table>_set_atualizado_em
  before update on poxpur.<table>
  for each row execute function poxpur.tg_set_atualizado_em();

alter table poxpur.<table> enable row level security;

-- SELECT
drop policy if exists "<table>_select_authenticated" on poxpur.<table>;
create policy "<table>_select_authenticated"
  on poxpur.<table> for select to authenticated
  using (true);  -- ou filtro mais restritivo

-- INSERT
drop policy if exists "<table>_insert_authenticated" on poxpur.<table>;
create policy "<table>_insert_authenticated"
  on poxpur.<table> for insert to authenticated
  with check (auth.uid() is not null);  -- ajuste

-- UPDATE
drop policy if exists "<table>_update_owner_or_admin" on poxpur.<table>;
create policy "<table>_update_owner_or_admin"
  on poxpur.<table> for update to authenticated
  using (poxpur.is_admin() /* OR <owner check> */)
  with check (poxpur.is_admin() /* OR <owner check> */);

-- DELETE (geralmente só admin)
drop policy if exists "<table>_delete_admin" on poxpur.<table>;
create policy "<table>_delete_admin"
  on poxpur.<table> for delete to authenticated
  using (poxpur.is_admin());

grant select, insert, update, delete on poxpur.<table> to authenticated;
grant all on poxpur.<table> to service_role;

-- Se for tabela live (Realtime), adicionar:
-- alter publication supabase_realtime add table poxpur.<table>;
```

## Template — RPC pra n8n usar via node Supabase nativo

RPCs ficam em **public** (não poxpur) porque o node Supabase nativo do n8n só vê `public`. Use `security definer` + `set search_path = ''` por segurança.

```sql
create or replace function public.poxpur_<nome>(
  p_arg1 text,
  p_arg2 uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result uuid;
begin
  -- Lógica que acessa poxpur.*
  insert into poxpur.<table> (...)
  values (...)
  returning id into v_result;

  return jsonb_build_object('id', v_result);
end;
$$;

grant execute on function public.poxpur_<nome>(text, uuid) to anon, authenticated, service_role;
```

## Template — View em public que espelha tabela poxpur

```sql
create or replace view public.poxpur_<table>
with (security_invoker = true) as
select * from poxpur.<table>;

grant select on public.poxpur_<table> to anon, authenticated, service_role;
-- Se updateable:
grant update on public.poxpur_<table> to authenticated, service_role;
```

`security_invoker = true` é **essencial** — herda RLS do schema poxpur. Sem isso (default `security_definer`), a view bypassa RLS — perigoso.

## Passos da execução

1. **Pegar info do usuário**:
   - Nome da tabela/RPC/view
   - Colunas/argumentos
   - Quem pode SELECT/INSERT/UPDATE/DELETE (regras de RLS)
   - Se precisa Realtime

2. **Gerar SQL** seguindo o template acima.

3. **Aplicar via MCP**:
   ```
   mcp__plugin_supabase_supabase__apply_migration
     project_id: xeondnsyfhhxkdpugmap
     name: create_<table>
     query: <SQL inteiro>
   ```

4. **Versionar localmente**:
   - Criar arquivo `supabase/migrations/<timestamp>_<descricao>.sql` com o mesmo SQL
   - Timestamp em UTC: `date -u +"%Y%m%d%H%M%S"`

5. **Atualizar types**:
   - Adicionar manualmente em `src/types/database.ts` o tipo da nova tabela (`Row`, `Insert`, `Update`)
   - Exportar alias `Poxpur<Table>`
   - Se tiver enums novos, adicionar em `Enums`

6. **Verificar typecheck**: `pnpm typecheck`

7. **Reportar**: caminho do arquivo SQL, link do MCP application, qualquer warning do Supabase advisor.

## Lembre-se

- Compartilhamos projeto Supabase com outro app — NÃO usar schema `public` pra tabelas novas (a menos que seja view espelho)
- Função `poxpur.is_admin()` já existe — use ela em policies
- Função `poxpur.tg_set_atualizado_em()` já existe — use ela no trigger
- Não criar trigger automático `auth.users → poxpur.profiles` (perfis só por convite admin)
