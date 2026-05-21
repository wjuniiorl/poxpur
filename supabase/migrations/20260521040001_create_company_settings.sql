-- Onda 5: configurações da empresa (singleton)
create table if not exists poxpur.company_settings (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique,
  razao_social text,
  nome_fantasia text default 'Poxpur',
  cnpj text,
  inscricao_estadual text,
  endereco text,
  cidade text,
  estado text,
  cep text,
  telefone text,
  email text,
  logo_url text,
  whatsapp_phone text,
  whatsapp_token_configured boolean not null default false,
  n8n_webhook_url text,
  recebe_resumo_diario boolean not null default false,
  hora_resumo_diario text default '18:00',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (singleton = true)
);

drop trigger if exists company_settings_set_atualizado_em on poxpur.company_settings;
create trigger company_settings_set_atualizado_em
  before update on poxpur.company_settings
  for each row execute function poxpur.tg_set_atualizado_em();

alter table poxpur.company_settings enable row level security;

drop policy if exists "company_settings_select_authenticated" on poxpur.company_settings;
create policy "company_settings_select_authenticated"
  on poxpur.company_settings for select to authenticated
  using (true);

drop policy if exists "company_settings_modify_admin" on poxpur.company_settings;
create policy "company_settings_modify_admin"
  on poxpur.company_settings for all to authenticated
  using (poxpur.is_admin())
  with check (poxpur.is_admin());

grant select on poxpur.company_settings to authenticated;
grant insert, update on poxpur.company_settings to authenticated;

insert into poxpur.company_settings (id, nome_fantasia, razao_social, telefone, email)
values ('50000000-0000-0000-0000-000000000001', 'Poxpur', 'Poxpur Distribuição Ltda', '+5511999999999', 'contato@poxpur.com.br')
on conflict (id) do nothing;
