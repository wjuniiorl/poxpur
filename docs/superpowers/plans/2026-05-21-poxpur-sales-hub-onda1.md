# Poxpur Sales Hub — Onda 1 (Fundação) — Implementation Plan

> **For agentic workers:** Execute task-by-task. Steps use checkbox (`- [ ]`) syntax.
>
> **NOTE:** Esta versão é uma reconstrução condensada após o arquivo original ser apagado acidentalmente em 2026-05-21. As tasks abaixo são o sumário; o conteúdo detalhado de cada uma (código completo, comandos, expected output) foi mantido em contexto durante a sessão. Esta lista serve de checklist + ponteiro pra arquivos a criar.

**Goal:** Entregar o esqueleto funcional do Poxpur Sales Hub (auth + layout sem-scroll + 8 rotas + Dashboard mockado + PWA + seeds) sobre Supabase Cloud no schema dedicado `poxpur`.

**Spec:** `docs/superpowers/specs/2026-05-21-poxpur-sales-hub-onda1-design.md`

**Project:** `c:\Python\alex` — Supabase project `wpbuufsswgxutzzzxivp` (escritorio).

---

## Phase 0 — Bootstrap

- [x] **Task 1:** `git init` + `.gitignore` + `README.md`. Commit: `chore: initial commit`
- [x] **Task 2:** `pnpm create vite . --template react-ts` (React 19), `pnpm install`, limpar boilerplate (`App.tsx`, `main.tsx` sem index.css, remover assets/svgs). Verificar `pnpm dev`. Commit: `chore: scaffold Vite + React + TypeScript`
- [ ] **Task 3:** TypeScript strict (target ES2022, strict, noUnusedLocals/Parameters, noUncheckedIndexedAccess, baseUrl=`.`, paths `@/*`→`src/*`). Instalar `@types/node`. Alias `@` no `vite.config.ts`. Script `typecheck: tsc --noEmit -p tsconfig.app.json`. Commit.
- [ ] **Task 4:** Tailwind 3 + PostCSS + autoprefixer + tailwindcss-animate + @fontsource-variable/inter. Criar `tailwind.config.ts` (darkMode class, colors mapped a CSS vars, poxpur aliases, font Inter Variable, borderRadius xl→var(--radius), shadows soft/card), `postcss.config.js`, `src/styles/globals.css` (CSS vars HSL light+dark, html/body/#root h-100vh overflow-hidden). Importar em main.tsx. Smoke test visual no App.tsx. Commit.
- [ ] **Task 5:** Prettier + prettier-plugin-tailwindcss. `.prettierrc.json`, `.prettierignore`. Scripts lint+format. `pnpm format` + `pnpm lint` passam. Commit.
- [ ] **Task 6:** Instalar runtime deps em uma chamada: `react-router-dom @tanstack/react-query zustand react-hook-form zod @hookform/resolvers @supabase/supabase-js sonner lucide-react clsx tailwind-merge class-variance-authority`. Typecheck. Commit.
- [ ] **Task 7:** shadcn/ui — criar `src/lib/utils.ts` (cn helper), `components.json` (style default, neutral baseColor, alias `@/components`). `pnpm dlx shadcn@latest add button input label form card alert avatar dropdown-menu sheet skeleton tooltip separator badge sonner --yes --overwrite`. Typecheck+lint. Commit.
- [ ] **Task 8:** `src/lib/env.ts` — zod schema validando `VITE_SUPABASE_URL` (url) + `VITE_SUPABASE_ANON_KEY` (≥20 chars). Throw com mensagem clara se inválido. `.env.example`. Importar e exibir prefixo da URL no App.tsx temporariamente. Commit.

## Phase 1 — Supabase backend

- [ ] **Task 9:** Migration 1 `supabase/migrations/20260521000001_create_poxpur_schema.sql` — `create schema poxpur`, grants, enums `user_role('admin','vendedor')` + `presence_status('online','ocupado','ausente','offline')`. Aplicar via MCP `apply_migration` em projeto `wpbuufsswgxutzzzxivp`. Verificar via `execute_sql`. Commit.
- [ ] **Task 10:** Migration 2 `20260521000002_create_profiles.sql` — tabela `poxpur.profiles` (id FK auth.users on delete cascade, nome, email, foto_url, telefone, role, presence, ativo, ultimo_acesso_em, criado_em, atualizado_em), índices, função `poxpur.is_admin()`, trigger `tg_set_atualizado_em`, RLS habilitada + 3 policies (select_authenticated, update_self, update_admin). Aplicar via MCP. Verificar. Commit.
- [ ] **Task 11:** Migration 3 `20260521000003_create_audit_logs.sql` — tabela `poxpur.audit_logs` (id default gen_random_uuid, user_id FK on delete set null, user_email, acao, recurso, payload jsonb, ip, user_agent, criado_em), índices, RLS + 2 policies (select_admin, insert_self). Aplicar via MCP. Verificar. Commit.
- [ ] **Task 12:** Migration 4 `20260521000004_seed_initial_users.sql` — 3 usuários demo (admin@poxpur.demo, joao@poxpur.demo, maria@poxpur.demo, todos com senha `Poxpur2026!`) via INSERT em `auth.users` + `auth.identities` + `poxpur.profiles`. Senha via `crypt('Poxpur2026!', gen_salt('bf', 10))`. Idempotente. Aplicar via MCP. Verificar 3 rows em profiles. Commit.
- [ ] **Task 13:** **AÇÃO MANUAL DO USUÁRIO** — adicionar `poxpur` em Settings → API → Exposed schemas no dashboard Supabase. Verificar via curl REST com Accept-Profile: poxpur. Sem commit.
- [ ] **Task 14:** `src/types/database.ts` — gerar via `pnpm dlx supabase gen types typescript --project-id wpbuufsswgxutzzzxivp --schema poxpur` ou (fallback) escrever manualmente baseado no schema. Exporta tipos `Database`, `PoxpurProfile`, `UserRole`, etc. Script `supabase:types`. Commit.
- [ ] **Task 15:** `src/lib/supabase.ts` — createClient com `db.schema='poxpur'` e auth pkce. `src/lib/queryClient.ts` — TanStack QueryClient com defaults razoáveis. Smoke test (`from('profiles').select count exact head`) deve retornar count=3 (ou erro PGRST106 se Task 13 não foi feito). Commit.

## Phase 2 — Branding primitives

- [ ] **Task 16:** `src/components/common/PoxpurLogo.tsx` — SVG inline component, props `size sm|md|lg|xl`, `variant full|mark`, `inverted bool`. Mark = rect verde+X branco; full = "POX" + mark + "PUR". Typecheck. Commit.
- [ ] **Task 17:** `src/components/common/PoxpurSpinner.tsx` — usa `<PoxpurLogo variant=mark>` com `animate-spin`, props `size`, `fullscreen`, `label`. Typecheck. Commit.
- [ ] **Task 18:** `src/stores/uiStore.ts` — Zustand store com `sidebarCollapsed`, `theme: 'light'|'dark'`, ações `toggleSidebar`, `setTheme`, `toggleTheme`. Persist em localStorage. Manipula `<html>` class `dark` ao setar tema. onRehydrateStorage aplica classe se persistido como dark. Typecheck. Commit.

## Phase 3 — Auth

- [ ] **Task 19:** `src/contexts/AuthContext.tsx` — Provider com state `session, profile, status`. Bootstrap: getSession → load profile from poxpur.profiles → status authenticated/no_profile. `onAuthStateChange` mantém sync. `signIn`, `signOut`, `requestPasswordReset`, `updatePassword`. Em login: insert em audit_logs + update ultimo_acesso_em. `src/hooks/useAuth.ts` consume context. Commit.
- [ ] **Task 20:** `src/hooks/useIsAdmin.ts` — retorna `useAuth().profile?.role === 'admin'`. Commit.
- [ ] **Task 21:** `src/components/auth/LoginForm.tsx` — rhf+zod, email+senha, link "Esqueci senha", botão verde-or-navy, spinner em loading, alert vermelho em erro, redireciona via `?from=` ou /dashboard. Commit.
- [ ] **Task 22:** `src/components/auth/ForgotPasswordForm.tsx` — email+botão, estado `sent` mostra "verifique email". Commit.
- [ ] **Task 23:** `src/components/auth/AuthLayout.tsx` (split 50/50 gradiente navy→green + card branco), `src/pages/Login.tsx`, `src/pages/ForgotPassword.tsx`, `src/pages/ResetPassword.tsx` (rhf+zod nova senha 2x, validação força ≥8 + maiúscula + número, redirect /login em sucesso). Commit.

## Phase 4 — Layout

- [ ] **Task 24:** `src/components/layout/Sidebar.tsx` — w-60 (collapsed w-16) bg-poxpur-navy, logo no topo (variant collapsed muda), 8 NavLink items com ícones lucide (Dashboard, Pedidos, Chat, Equipe, Clientes, Tarefas, Relatórios admin-only, Configurações admin-only), ativo com bg-navy-dark + border-l-2 border-green, rodapé com avatar+dropdown (Meu perfil disabled, Sair), botão chevron pra collapse via uiStore. Commit.
- [ ] **Task 25:** `src/components/layout/Header.tsx` — h-14 bg-card border-b, esquerda breadcrumb dinâmico (useLocation), direita Bell com Badge "0" placeholder + Tooltip "em breve", theme toggle (Moon/Sun), separator, avatar dropdown (nome+role+email+Sair). Commit.
- [ ] **Task 26:** `src/components/layout/Shell.tsx` — flex h-screen w-screen overflow-hidden, Sidebar + (Header + main overflow-y-auto + Outlet). `src/components/layout/ProtectedRoute.tsx` — gate de status (loading=spinner, unauthenticated/no_profile=Navigate to /login?from=, requireRole mismatch=tela "Sem permissão" com botão voltar). Commit.

## Phase 5 — Placeholder pages

- [ ] **Task 27:** `src/components/common/ComingSoonPage.tsx` — props `feature`, `onda`, `bullets`. Layout: PoxpurLogo mark XL + badge "Onda N" + título "Feature — em construção" + bullets com check verde + botão voltar dashboard. Commit.
- [ ] **Task 28:** Páginas: `Orders` (Onda 2), `ChatWhatsApp` (3), `Team` (4), `Customers` (2), `Tasks` (4), `Reports` (5), `Settings` (5), `NotFound` (page 404 com logo+botão). Cada uma usa ComingSoonPage. Commit.

## Phase 6 — Dashboard mockado

- [ ] **Task 29:** `src/lib/mocks.ts` — tipos MockStat/MockOrder/MockRanking + dados hard-coded + `statusLabels` map. Comentário `// TODO Onda 2:`. `src/components/dashboard/StatsCard.tsx` — Card com label uppercase, value 2xl bold navy, delta colorido com TrendingUp/Down icon. Commit.
- [ ] **Task 30:** `src/components/dashboard/RecentOrdersMock.tsx` (Card h-full com lista 5 pedidos: avatar seller + id+cliente + amount + status badge), `src/components/dashboard/SellerRankingMock.tsx` (Card admin-only com 3 vendedores: medalha + avatar + métrica + barra progress verde). Commit.
- [ ] **Task 31:** `src/pages/Dashboard.tsx` — saudação dinâmica (hora do dia) + nome+data BR, grid 4 cols StatsCards, grid 3 cols (col-span-2 RecentOrders + "próximos passos" card; col-span-1 ranking se admin senão "Seu desempenho" placeholder). Layout flex h-full sem scroll. Commit.
- [ ] **Task 32:** `src/routes.tsx` — todas as rotas com lazy import e Suspense fallback PoxpurSpinner. Públicas + protegidas em Shell + admin-only wrapper duplo. `src/App.tsx` final com QueryClientProvider + BrowserRouter + AuthProvider + AppRoutes + Toaster sonner. Smoke test E2E manual. Commit.

## Phase 7 — PWA

- [ ] **Task 33:** Instalar vite-plugin-pwa. Configurar em `vite.config.ts` com manifest (name, theme #1B2C5E, bg #FFF, lang pt-BR, ícones 192/512/maskable) e workbox runtimeCaching (woff2 CacheFirst, rest/v1 NetworkFirst timeout 5s). `registerType: 'autoUpdate'`. Atualizar `index.html` com meta theme-color, lang=pt-BR, título, apple-touch-icon. Commit.
- [ ] **Task 34:** `public/favicon.svg` (X verde Poxpur). Instalar sharp. `scripts/generate-pwa-icons.mjs` (gera pwa-192, pwa-512, apple-touch-icon 180 do SVG). Script `icons:generate`. Rodar. Commit ícones.
- [ ] **Task 35:** `src/hooks/useOnlineStatus.ts`, `src/components/common/OfflineBanner.tsx` (bg-poxpur-red banner topo quando offline), `src/components/common/PWAUpdatePrompt.tsx` (usa virtual:pwa-register/react, sonner toast em needRefresh com action recarregar). Atualizar `App.tsx` integrando OfflineBanner acima do AppRoutes + PWAUpdatePrompt. `vite-env.d.ts` ref tipo vite-plugin-pwa. Build prod + preview, confirmar SW ativo no DevTools. Commit.

## Phase 8 — Verificação

- [ ] **Task 36:** Reescrever `README.md` completo (setup, .env, instruções de expor schema, credenciais demo, scripts, estrutura, identidade visual, link FUTURE-REQUIREMENTS). Commit.
- [ ] **Task 37:** Checklist final — `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm preview`, validar todos os 16 critérios da spec §13 manualmente, rodar Lighthouse PWA+Accessibility ≥90, smoke test RLS via `execute_sql` (vendedor count=0, admin count≥1 em audit_logs). Tag `v0.1.0-onda1`. Mensagem final ao usuário.

---

**Conteúdo completo de cada task (código, comandos exatos, expected outputs) está no contexto da conversa quando este plano foi escrito originalmente. Após restauração, subagentes podem precisar de mais contexto via dispatch — o controller fornece task-por-task.**
