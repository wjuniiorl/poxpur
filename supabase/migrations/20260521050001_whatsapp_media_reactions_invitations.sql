-- Onda 6: WhatsApp robusto (mídia + reações + convites)

alter table poxpur.messages
  add column if not exists media_mime text,
  add column if not exists media_filename text,
  add column if not exists reactions jsonb not null default '[]'::jsonb;

create index if not exists messages_whatsapp_id_idx
  on poxpur.messages(whatsapp_message_id) where whatsapp_message_id is not null;

create or replace function poxpur.upsert_message_reaction(
  p_whatsapp_message_id text,
  p_by text,
  p_emoji text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing jsonb;
  v_filtered jsonb;
  v_new_entry jsonb;
begin
  select reactions into v_existing
  from poxpur.messages
  where whatsapp_message_id = p_whatsapp_message_id;

  if not found then return; end if;

  select coalesce(jsonb_agg(elem), '[]'::jsonb) into v_filtered
  from jsonb_array_elements(v_existing) elem
  where (elem->>'by') != p_by;

  if p_emoji = '' or p_emoji is null then
    update poxpur.messages set reactions = v_filtered
    where whatsapp_message_id = p_whatsapp_message_id;
    return;
  end if;

  v_new_entry := jsonb_build_object('by', p_by, 'emoji', p_emoji, 'at', now());
  update poxpur.messages
  set reactions = v_filtered || jsonb_build_array(v_new_entry)
  where whatsapp_message_id = p_whatsapp_message_id;
end;
$$;

grant execute on function poxpur.upsert_message_reaction(text, text, text) to anon, authenticated, service_role;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'invitation_status' and typnamespace = 'poxpur'::regnamespace) then
    create type poxpur.invitation_status as enum ('pendente', 'aceito', 'expirado', 'cancelado');
  end if;
end $$;

create table if not exists poxpur.user_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  nome text,
  role poxpur.user_role not null default 'vendedor',
  token uuid not null default gen_random_uuid() unique,
  status poxpur.invitation_status not null default 'pendente',
  invited_by uuid not null references auth.users(id) on delete cascade,
  accepted_user_id uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create unique index if not exists user_invitations_email_pending_idx
  on poxpur.user_invitations(email) where status = 'pendente';
create index if not exists user_invitations_token_idx on poxpur.user_invitations(token);
create index if not exists user_invitations_status_idx on poxpur.user_invitations(status);

drop trigger if exists user_invitations_set_atualizado_em on poxpur.user_invitations;
create trigger user_invitations_set_atualizado_em
  before update on poxpur.user_invitations
  for each row execute function poxpur.tg_set_atualizado_em();

alter table poxpur.user_invitations enable row level security;

drop policy if exists "invitations_select_admin" on poxpur.user_invitations;
create policy "invitations_select_admin" on poxpur.user_invitations for select to authenticated
  using (poxpur.is_admin());

drop policy if exists "invitations_insert_admin" on poxpur.user_invitations;
create policy "invitations_insert_admin" on poxpur.user_invitations for insert to authenticated
  with check (poxpur.is_admin() and invited_by = auth.uid());

drop policy if exists "invitations_update_admin" on poxpur.user_invitations;
create policy "invitations_update_admin" on poxpur.user_invitations for update to authenticated
  using (poxpur.is_admin()) with check (poxpur.is_admin());

drop policy if exists "invitations_delete_admin" on poxpur.user_invitations;
create policy "invitations_delete_admin" on poxpur.user_invitations for delete to authenticated
  using (poxpur.is_admin());

drop policy if exists "invitations_select_by_token" on poxpur.user_invitations;
create policy "invitations_select_by_token" on poxpur.user_invitations for select to anon
  using (status = 'pendente' and expires_at > now());

grant select, insert, update, delete on poxpur.user_invitations to authenticated;
grant select on poxpur.user_invitations to anon;
