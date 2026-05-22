-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Bug: as policies de SELECT em internal_channels e internal_channel_members
-- criadas na migration de hardening (20260522020001) tinham referência
-- cruzada com internal_channel_members, causando infinite recursion no
-- runtime do Postgres (erro 500 ao listar canais internos).
--
-- Fix: helper SECURITY DEFINER `poxpur.is_channel_member(channel_id, user_id)`
-- que bypassa RLS pra checar membership, e policies novas que usam o helper.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

create or replace function poxpur.is_channel_member(p_channel_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from poxpur.internal_channel_members
    where channel_id = p_channel_id and user_id = p_user_id
  );
$$;

revoke execute on function poxpur.is_channel_member(uuid, uuid) from public, anon;
grant execute on function poxpur.is_channel_member(uuid, uuid) to authenticated, service_role;

drop policy if exists "channel_members_select_via_channel" on poxpur.internal_channel_members;
create policy "channel_members_select_via_channel"
  on poxpur.internal_channel_members for select to authenticated
  using (
    poxpur.is_admin()
    or user_id = auth.uid()
    or poxpur.is_channel_member(channel_id, auth.uid())
    or exists (
      select 1 from poxpur.internal_channels c
      where c.id = internal_channel_members.channel_id
        and (c.tipo = 'publico' or c.criado_por = auth.uid())
    )
  );

drop policy if exists "channels_select_member_or_public" on poxpur.internal_channels;
create policy "channels_select_member_or_public"
  on poxpur.internal_channels for select to authenticated
  using (
    tipo = 'publico'
    or criado_por = auth.uid()
    or poxpur.is_admin()
    or poxpur.is_channel_member(id, auth.uid())
  );
