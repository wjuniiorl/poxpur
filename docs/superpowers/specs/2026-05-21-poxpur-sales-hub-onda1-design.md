# Poxpur Sales Hub — Onda 1 (Fundação) — Design

**Data:** 2026-05-21
**Status:** Design aprovado pelo usuário em 2026-05-21
**Próximo passo:** writing-plans → executing-plans

---

## 1. Contexto

"Poxpur Sales Hub" é uma SPA de gestão de equipe de vendas para representantes da Poxpur. O sistema completo (descrito em conversa) envolve 6–8 subsistemas independentes: shell+auth, dashboard, pedidos, chat WhatsApp, modal de criação de pedido a partir do chat, chat interno de equipe, tarefas, relatórios, configurações, PWA. Tentar construir tudo em uma sessão produziria código superficial e bugs em cascata.

**Decomposição acordada em 5 ondas:**

| Onda | Conteúdo | Esta spec |
|------|---------|-----------|
| **1 — Fundação** | Casca + Auth + sidebar/header sem-scroll + Dashboard mockado + PWA + seeds | ✅ |
| 2 — Pedidos + CRM + Dashboard real | Schema completo de pedidos, kanban+tabela, CRM, dashboard alimentado por dados reais, aprovação admin, notificações in-app | — |
| 3 — Chat WhatsApp + integrações | Meta Cloud API, modal "Criar Pedido a partir do chat", n8n (notificações + resumo diário) | — |
| 4 — Equipe (chat interno) + Tarefas | Canais, DMs, presença, menções, kanban de tarefas | — |
| 5 — Relatórios + Configurações + Onboarding + MFA | Recharts, configurações admin, wizard de onboarding, MFA | — |

Esta spec cobre **somente a Onda 1**. As outras viram specs separadas em sessões futuras.

---

## 2. Escopo da Onda 1

**Entra:**
- Vite + React + TypeScript + Tailwind + shadcn/ui scaffold completo
- Identidade visual Poxpur (cores, tipografia Inter, logo placeholder SVG)
- Layout sem-scroll (sidebar + header + main com scroll interno)
- 8 rotas: 1 funcional (Dashboard mockado) + 7 placeholders ("em breve")
- Login + recuperação de senha (Supabase Auth Cloud)
- Schema Postgres dedicado `poxpur` (isolado do outro app no mesmo projeto)
- 2 tabelas: `poxpur.profiles` + `poxpur.audit_logs`, com RLS
- 3 usuários seed (1 admin + 2 vendedores)
- PWA básico (manifest + service worker Workbox)
- Validação de env vars com zod
- ESLint + Prettier + tsc strict

**Não entra (out-of-scope, vai pra ondas futuras):**
- Schema/UI de pedidos, clientes, produtos, conversations, messages, tasks, channels, notifications
- Integração WhatsApp Cloud API ou n8n
- Fluxo de aprovação de pedidos, verificação de estoque, resumo diário (registrado em FUTURE-REQUIREMENTS.md)
- Chat interno entre funcionários
- Supabase Realtime / presence
- Onboarding wizard (Onda 5)
- MFA (Onda 5)
- Dark mode polido (toggle existe mas paleta dark é aproximada — refinamos na Onda 5)
- Modo mobile <1024px
- Convite de funcionário por email (Onda 5)

---

## 3. Stack

| Camada | Escolha | Versão alvo |
|--------|---------|-------------|
| Build | Vite | 5.x |
| Framework | React | 18.x |
| Linguagem | TypeScript (strict + noUncheckedIndexedAccess) | 5.x |
| Router | React Router | 6.x |
| Server state | TanStack Query | 5.x |
| Client state | Zustand (UI) + React Context (auth) | 4.x / — |
| Forms | react-hook-form + zod | 7.x / 3.x |
| Estilo | Tailwind CSS + shadcn/ui | 3.x / latest |
| Toasts | sonner | latest |
| Ícones | lucide-react | latest |
| Backend | Supabase Cloud (@supabase/supabase-js) | 2.x |
| PWA | vite-plugin-pwa (Workbox) | latest |
| Fonts | @fontsource-variable/inter (self-hosted) | latest |
| Lint/format | ESLint + Prettier | latest |
| Package manager | pnpm | 11.x |

**Justificativa do stack A (padrão da comunidade shadcn):** menor surpresa, mais exemplos online, fácil estender nas ondas futuras. Alternativas TanStack Router (mais type-safe) e minimalista (Context puro) foram rejeitadas por curva de aprendizado e dívida técnica respectivamente.

---

## 4. Identidade visual (resumida)

Paleta HSL como CSS variables mapeadas a tokens shadcn:

- `--poxpur-navy: 224 55% 24%` (#1B2C5E) — primário, sidebar
- `--poxpur-navy-dark: 226 60% 15%` (#0F1B3D) — hover/ativo
- `--poxpur-green: 84 53% 51%` (#8BC53F) — CTA, destaque
- `--poxpur-green-dark: 84 56% 41%` (#6BA02F) — hover do verde
- `--poxpur-red: 354 76% 56%` (#E63946) — alertas

Tipografia: Inter Variable self-hosted (sem CDN).
Cantos: `--radius: 0.75rem` (rounded-xl).
Logo: SVG inline `PoxpurLogo` com wordmark POXPUR + X verde, variants `full|mark`.
Spinner: X verde girando.
shadcn components na Onda 1: Button, Input, Label, Form, Card, Alert, Avatar, DropdownMenu, Sheet, Skeleton, Tooltip, Separator, Badge, Sonner.

---

## 5. Schema Supabase (`poxpur`)

### Isolamento

Projeto Supabase "escritorio" (`wpbuufsswgxutzzzxivp`) já hospeda outro app em `public`. Pra evitar colisões, criamos schema dedicado `poxpur`.

**Ação manual do usuário:** após Migration 1, adicionar `poxpur` em **Settings → API → Exposed schemas** no dashboard.

### Migrations (4)

1. `20260521000001_create_poxpur_schema.sql` — schema + enums `user_role` (admin/vendedor) e `presence_status` (online/ocupado/ausente/offline)
2. `20260521000002_create_profiles.sql` — `poxpur.profiles` (id FK auth.users, nome, email, foto_url, telefone, role, presence, ativo, ultimo_acesso_em, criado_em, atualizado_em), função `is_admin()`, trigger `tg_set_atualizado_em`, RLS (3 policies: select_authenticated, update_self, update_admin)
3. `20260521000003_create_audit_logs.sql` — `poxpur.audit_logs` (id, user_id, user_email, acao, recurso, payload jsonb, ip, user_agent, criado_em), RLS (2 policies: select_admin, insert_self) — imutáveis (sem UPDATE/DELETE)
4. `20260521000004_seed_initial_users.sql` — 3 usuários demo:
   - `admin@poxpur.demo` / `Poxpur2026!` (role admin)
   - `joao@poxpur.demo` / `Poxpur2026!` (role vendedor)
   - `maria@poxpur.demo` / `Poxpur2026!` (role vendedor)

Aplicadas via Supabase MCP `apply_migration` (não via CLI local).

---

## 6. Autenticação

### AuthContext

```ts
type AuthStatus = 'loading' | 'unauthenticated' | 'no_profile' | 'authenticated';
```

Fluxo:
1. Mount → `getSession()`
2. Tem session → busca `poxpur.profiles` por user.id
3. Perfil ativo → `status='authenticated'`, registra `ultimo_acesso_em`
4. Sem perfil ou inativo → `signOut()` + toast "Sem acesso"
5. `onAuthStateChange` mantém sincronização

Em sucesso: insere row em `poxpur.audit_logs` (acao=`login`, user_id, user_email, user_agent). Campo `ip` fica null na Onda 1 (browser não expõe IP).

### Login

Tela split 50/50: esquerda gradiente Poxpur navy→green-dark com logo+tagline; direita card branco com form (email+senha+lembrar-de-mim+entrar+esqueci-senha). Validação zod em PT-BR.

### Recuperação/Reset

`/forgot-password` → `resetPasswordForEmail` → toast "verifique email"
`/reset-password` (callback do link) → form nova senha 2x + validação força (≥8, 1 maiúscula, 1 número) → `updateUser({password})` → redirect login

### ProtectedRoute

`<ProtectedRoute requireRole?>` — gate por status + role. Loading → spinner fullscreen. Unauth → `/login?from=`. Sem permissão → tela com botão "Voltar".

---

## 7. Layout sem-scroll (★)

`<html>`, `<body>`, `#root` com `height: 100vh; overflow: hidden` no globals.css. Scroll só no `<main>` interno.

```
┌─ Sidebar (w-60, h-full, bg-poxpur-navy) ─┬─ Header (h-14, bg-card) ─┐
│ Logo Poxpur                              │ breadcrumb + bell + ...  │
│ 8 nav items (6 vendedor, 8 admin)        ├──────────────────────────┤
│ ...                                       │                          │
│ Avatar + dropdown (Sair)                 │ <main overflow-y-auto>   │
│                                          │   <Outlet />             │
└──────────────────────────────────────────┴──────────────────────────┘
```

### Sidebar

w-60 (collapsible 64px via Zustand), bg-navy, nav items lucide-react:
1. Dashboard, 2. Pedidos, 3. Chat WhatsApp, 4. Equipe, 5. Clientes, 6. Tarefas, 7. Relatórios (admin), 8. Configurações (admin).
Item ativo: bg-navy-dark + border-l-2 border-green.

### Header

h-14, breadcrumb dinâmico, bell (badge "0" placeholder), theme toggle (light/dark), avatar dropdown.

---

## 8. Rotas

```
Públicas (sem Shell):
  /login, /forgot-password, /reset-password

Protegidas (ProtectedRoute + Shell):
  / → /dashboard
  /dashboard → Dashboard (funcional, mockado)
  /orders, /chat, /team, /customers, /tasks → ComingSoonPage
  /reports, /settings → ComingSoonPage (requireRole='admin')
  * → NotFound
```

### Dashboard (mockado)

Layout 1080p **sem scroll**:
- Saudação + data
- 4 StatsCards (Pedidos hoje, Faturamento mês, Ticket médio, Conversão) com delta % colorido
- Grid 3 cols: pedidos recentes (col-span-2) + ranking vendedores (admin-only) + "próximos passos do produto"

Dados de `src/lib/mocks.ts` com `// TODO Onda 2:` em cada uso.

---

## 9. PWA

vite-plugin-pwa com manifest (theme #1B2C5E, background #FFF, lang pt-BR, ícones 192/512/maskable), workbox runtime caching (fonts CacheFirst, supabase REST NetworkFirst com timeout 5s), `registerType: 'autoUpdate'`.

`<OfflineBanner />` quando `!navigator.onLine`. `<PWAUpdatePrompt />` sonner toast em `needRefresh`.

Ícones gerados de `public/favicon.svg` (X verde Poxpur) via `scripts/generate-pwa-icons.mjs` (sharp): 192x192, 512x512, apple-touch-icon 180.

---

## 10. Validação de env

`src/lib/env.ts` com zod schema obrigando `VITE_SUPABASE_URL` (URL) e `VITE_SUPABASE_ANON_KEY` (≥20 chars). App quebra no boot com mensagem clara se faltar.

`.env.example` na raiz como template.

---

## 11. Cliente Supabase

`src/lib/supabase.ts`:
```ts
createClient<Database, 'poxpur'>(url, key, {
  db: { schema: 'poxpur' },
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
});
```

Schema padrão `poxpur` — `supabase.from('profiles')` aponta automaticamente pra `poxpur.profiles`.

---

## 12. Estrutura de pastas

```
src/
├── main.tsx, App.tsx, routes.tsx, vite-env.d.ts
├── pages/                      Login, ForgotPassword, ResetPassword, Dashboard,
│                               Orders, ChatWhatsApp, Team, Customers, Tasks,
│                               Reports, Settings, NotFound
├── components/
│   ├── layout/                 Shell, Sidebar, Header, ProtectedRoute
│   ├── auth/                   AuthLayout, LoginForm, ForgotPasswordForm
│   ├── dashboard/              StatsCard, RecentOrdersMock, SellerRankingMock
│   ├── common/                 PoxpurLogo, PoxpurSpinner, ComingSoonPage,
│   │                           OfflineBanner, PWAUpdatePrompt
│   └── ui/                     shadcn components
├── contexts/                   AuthContext
├── hooks/                      useAuth, useProfile, useIsAdmin, useOnlineStatus
├── lib/                        supabase, queryClient, env, utils, mocks
├── stores/                     uiStore
├── types/                      database.ts
└── styles/                     globals.css

supabase/migrations/            20260521000001..04_*.sql
scripts/                        generate-pwa-icons.mjs
public/                         favicon.svg, pwa-*.png, apple-touch-icon.png
```

---

## 13. Critérios de pronto

1. `pnpm dev` sobe sem erro
2. `pnpm typecheck` zero erros
3. `pnpm build` cria dist/ com sw.js
4. Login com cada um dos 3 seeds funciona
5. Admin vê 8 nav items, vendedor vê 6
6. Dashboard renderiza, ranking só pra admin
7. Vendedor em `/settings` vê tela "Sem permissão"
8. Reset de senha E2E (link do email funciona)
9. **Sem scroll no body** em viewport 1920x1080 em qualquer rota
10. Lighthouse PWA score ≥ 90 em `pnpm preview` build de produção local
11. Lighthouse Accessibility score ≥ 90
12. Manifest válido + app instalável
13. Tudo em PT-BR
14. Schema `poxpur` invisível ao app `escritorio`

---

## 14. Riscos & mitigações

| Risco | Mitigação |
|---|---|
| Esquecer expor `poxpur` na API | README com instruções claras + erro UI específico em PGRST106 |
| Outro app altera `auth.users` | `on delete cascade` em profiles; audit_logs snapshot do email |
| Seeds 2x | Idempotência via `if not exists`, `on conflict do nothing` |
| Cache vazio = "lento" | Skeletons + placeholderData TanStack Query |
| SW antigo trava update | `autoUpdate` + `<PWAUpdatePrompt />` |
| Esquecer remover mocks Onda 2 | Comentário `// TODO Onda 2:` em cada uso |
| Apps "vazam" entre si | RLS sempre filtra por auth.uid()+role no schema próprio |

---

## 15. Próximos passos

1. Esta spec revisada/aprovada pelo usuário ✅
2. Plano de implementação detalhado → 37 tasks atômicas em 8 fases
3. Execução via subagent-driven-development
4. Onda 1 entregue → próxima sessão começa pela Onda 2

---

**Nota:** Este arquivo foi restaurado em 2026-05-21 após ser acidentalmente deletado por `pnpm create vite --overwrite`. Conteúdo equivalente ao original, em forma condensada (a versão original tinha trechos SQL completos, agora referenciados no PLAN).
