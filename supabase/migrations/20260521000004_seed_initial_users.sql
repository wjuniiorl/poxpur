-- Seeds de demonstração — 3 usuários (1 admin + 2 vendedores), todos com senha 'Poxpur2026!'
-- Idempotente via on conflict do nothing
create extension if not exists "pgcrypto" with schema public;

do $$
declare
  v_admin_id uuid := '00000000-0000-0000-0000-000000000001';
  v_joao_id  uuid := '00000000-0000-0000-0000-000000000002';
  v_maria_id uuid := '00000000-0000-0000-0000-000000000003';
  v_hashed_password text := crypt('Poxpur2026!', gen_salt('bf', 10));
begin
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin
  )
  values (
    v_admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'admin@poxpur.demo', v_hashed_password,
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"nome":"Admin Poxpur"}'::jsonb,
    false
  )
  on conflict (id) do nothing;

  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin
  )
  values (
    v_joao_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'joao@poxpur.demo', v_hashed_password,
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"nome":"João Silva"}'::jsonb,
    false
  )
  on conflict (id) do nothing;

  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin
  )
  values (
    v_maria_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'maria@poxpur.demo', v_hashed_password,
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"nome":"Maria Souza"}'::jsonb,
    false
  )
  on conflict (id) do nothing;

  insert into poxpur.profiles (id, nome, email, role, ativo)
  values
    (v_admin_id, 'Admin Poxpur', 'admin@poxpur.demo', 'admin', true),
    (v_joao_id,  'João Silva',   'joao@poxpur.demo',  'vendedor', true),
    (v_maria_id, 'Maria Souza',  'maria@poxpur.demo', 'vendedor', true)
  on conflict (id) do nothing;

  -- Nota: coluna `email` em auth.identities é generated — não inserir explicitamente
  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    created_at, updated_at, last_sign_in_at
  )
  values
    (gen_random_uuid(), v_admin_id, jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@poxpur.demo', 'email_verified', true), 'email', v_admin_id::text, now(), now(), now()),
    (gen_random_uuid(), v_joao_id,  jsonb_build_object('sub', v_joao_id::text,  'email', 'joao@poxpur.demo',  'email_verified', true), 'email', v_joao_id::text,  now(), now(), now()),
    (gen_random_uuid(), v_maria_id, jsonb_build_object('sub', v_maria_id::text, 'email', 'maria@poxpur.demo', 'email_verified', true), 'email', v_maria_id::text, now(), now(), now())
  on conflict (provider, provider_id) do nothing;
end $$;
