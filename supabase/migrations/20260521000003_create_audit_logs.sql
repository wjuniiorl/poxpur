create table if not exists poxpur.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  acao text not null,
  recurso text,
  payload jsonb,
  ip text,
  user_agent text,
  criado_em timestamptz not null default now()
);

create index if not exists audit_logs_user_id_idx on poxpur.audit_logs(user_id);
create index if not exists audit_logs_criado_em_idx on poxpur.audit_logs(criado_em desc);
create index if not exists audit_logs_acao_idx on poxpur.audit_logs(acao);

alter table poxpur.audit_logs enable row level security;

drop policy if exists "audit_logs_select_admin" on poxpur.audit_logs;
create policy "audit_logs_select_admin"
  on poxpur.audit_logs for select to authenticated
  using (poxpur.is_admin());

drop policy if exists "audit_logs_insert_self" on poxpur.audit_logs;
create policy "audit_logs_insert_self"
  on poxpur.audit_logs for insert to authenticated
  with check (auth.uid() = user_id);

-- Sem policies de UPDATE ou DELETE: logs são imutáveis
