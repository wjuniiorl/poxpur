-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Hardening adicional (resultado da varredura completa de 2026-05-22):
--   1. Trigger functions em poxpur.tg_* tinham EXECUTE público → expostas
--      como /rest/v1/rpc/<name>. Revoga acesso public/anon/authenticated.
--   2. Policy conversations_insert_authenticated era permissiva (WITH CHECK true) —
--      qualquer authenticated podia criar conversation com qualquer assigned_to.
--      Restringe a (assigned_to = auth.uid() OR null OR admin).
--   3. Grant explícito de SELECT em user_invitations pra anon (necessário pro
--      fluxo de aceitar convite via token sem login).
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

revoke execute on function poxpur.tg_recalc_order_totals() from public, anon, authenticated;
revoke execute on function poxpur.tg_set_atualizado_em() from public, anon, authenticated;
revoke execute on function poxpur.tg_notify_admins_on_new_order() from public, anon, authenticated;
revoke execute on function poxpur.tg_notify_seller_on_status_change() from public, anon, authenticated;
revoke execute on function poxpur.tg_update_conversation_on_message() from public, anon, authenticated;
revoke execute on function poxpur.tg_task_set_concluido_em() from public, anon, authenticated;
revoke execute on function poxpur.tg_notify_task_assignee() from public, anon, authenticated;

drop policy if exists "conversations_insert_authenticated" on poxpur.conversations;
create policy "conversations_insert_authenticated"
  on poxpur.conversations for insert to authenticated
  with check (
    assigned_to = auth.uid()
    or assigned_to is null
    or poxpur.is_admin()
  );

grant select on poxpur.user_invitations to anon;
