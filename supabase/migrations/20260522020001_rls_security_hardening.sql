-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- RLS Security Hardening (audit findings 2026-05-22)
-- Aplicado via Supabase MCP. Migration versionada pra reprodutibilidade.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ─── C1: RPCs inbound restritas a service_role ───────────────────────
revoke execute on function public.poxpur_inbound_message(text, text, text, text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.poxpur_inbound_reaction(text, text, text) from public, anon, authenticated;
grant execute on function public.poxpur_inbound_message(text, text, text, text, text, text, text, text) to service_role;
grant execute on function public.poxpur_inbound_reaction(text, text, text) to service_role;

-- ─── C2: upsert_message_reaction restrita ────────────────────────────
revoke execute on function poxpur.upsert_message_reaction(text, text, text) from public, anon, authenticated;
grant execute on function poxpur.upsert_message_reaction(text, text, text) to service_role;

-- ─── C3: Notifications insert só service_role ────────────────────────
drop policy if exists "notifications_insert_service" on poxpur.notifications;
create policy "notifications_insert_service"
  on poxpur.notifications for insert to service_role
  with check (true);

-- ─── A1: search_path fixo + SECURITY DEFINER nas triggers ────────────
alter function poxpur.tg_recalc_order_totals() set search_path = '';
alter function poxpur.tg_set_atualizado_em() set search_path = '';
alter function poxpur.tg_notify_admins_on_new_order() set search_path = '';
alter function poxpur.tg_notify_seller_on_status_change() set search_path = '';
alter function poxpur.tg_update_conversation_on_message() set search_path = '';
alter function poxpur.tg_task_set_concluido_em() set search_path = '';
alter function poxpur.tg_notify_task_assignee() set search_path = '';
alter function poxpur.tg_notify_admins_on_new_order() security definer;
alter function poxpur.tg_notify_seller_on_status_change() security definer;
alter function poxpur.tg_notify_task_assignee() security definer;

-- ─── A3 + A4: Channel members ────────────────────────────────────────
drop policy if exists "channel_members_insert_authenticated" on poxpur.internal_channel_members;
create policy "channel_members_insert_admin_or_creator"
  on poxpur.internal_channel_members for insert to authenticated
  with check (
    poxpur.is_admin() or exists (
      select 1 from poxpur.internal_channels c
      where c.id = internal_channel_members.channel_id
        and (c.criado_por = auth.uid() or c.tipo = 'publico')
    )
  );

drop policy if exists "channel_members_select_authenticated" on poxpur.internal_channel_members;
create policy "channel_members_select_via_channel"
  on poxpur.internal_channel_members for select to authenticated
  using (
    poxpur.is_admin() or exists (
      select 1 from poxpur.internal_channels c
      where c.id = internal_channel_members.channel_id
        and (
          c.tipo = 'publico'
          or c.criado_por = auth.uid()
          or exists (
            select 1 from poxpur.internal_channel_members m2
            where m2.channel_id = c.id and m2.user_id = auth.uid()
          )
        )
    )
  );

-- ─── A6 + A7: revogar execute amplo ──────────────────────────────────
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
revoke execute on function poxpur.is_admin() from public, anon;
grant execute on function poxpur.is_admin() to authenticated, service_role;

-- ─── A8: Bucket whatsapp-media — SELECT só authenticated ─────────────
drop policy if exists "whatsapp_media_read_public" on storage.objects;
create policy "whatsapp_media_read_authenticated"
  on storage.objects for select to authenticated
  using (bucket_id = 'whatsapp-media');
