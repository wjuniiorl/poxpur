# Poxpur Sales Hub

Sistema de gestão de equipe de vendas para representantes da Poxpur. SPA em React + TypeScript com Supabase como backend.

**Status:** Onda 1 (Fundação) ✓ entregue. Próximas ondas no roadmap em [`FUTURE-REQUIREMENTS.md`](./FUTURE-REQUIREMENTS.md).

## Stack

Vite 5, React 19, TypeScript strict, React Router 6, TanStack Query 5, Zustand, Tailwind CSS, shadcn/ui, Supabase (Auth + Postgres com schema `poxpur` + RLS), vite-plugin-pwa.

## Setup local

### 1. Pré-requisitos

- Node.js 22+ e pnpm 11+
- Projeto Supabase Cloud com schema `poxpur` exposto na API (ver passo 4)

### 2. Variáveis de ambiente

Crie `.env` na raiz baseado em `.env.example`:

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

### 3. Instalar e rodar

```bash
pnpm install
pnpm dev
```

App em http://localhost:5173.

### 4. ⚠️ Expor schema `poxpur` no Supabase (obrigatório)

Sem este passo, o cliente supabase-js retorna `PGRST106 (schema not in api)` e o app não consegue ler nenhuma tabela.

1. Acesse Dashboard Supabase → **Settings → API**
2. Em **Data API Settings → Exposed schemas**, adicione `poxpur` à lista (mantenha `public` que já está lá)
3. Salve

### 5. Credenciais demo (após migrations + seeds)

| Usuário | Senha | Role |
|---------|-------|------|
| admin@poxpur.demo | Poxpur2026! | admin |
| joao@poxpur.demo | Poxpur2026! | vendedor |
| maria@poxpur.demo | Poxpur2026! | vendedor |

## Scripts

| Comando | Função |
|---------|--------|
| `pnpm dev` | Servidor de desenvolvimento Vite |
| `pnpm build` | Typecheck + build de produção |
| `pnpm preview` | Servir build de produção localmente (porta 4173) |
| `pnpm typecheck` | `tsc --noEmit` sem build |
| `pnpm lint` | ESLint, zero warnings |
| `pnpm format` | Prettier auto-format |
| `pnpm supabase:types` | Regenera tipos TS do schema poxpur (requer `supabase login`) |
| `pnpm icons:generate` | Regenera ícones PWA do SVG |

## Estrutura

```
src/
├── pages/             Páginas (lazy loaded): Login, ForgotPassword, ResetPassword,
│                      Dashboard, Orders, ChatWhatsApp, Team, Customers, Tasks,
│                      Reports, Settings, NotFound
├── components/
│   ├── layout/        Shell, Sidebar, Header, ProtectedRoute
│   ├── auth/          AuthLayout, LoginForm, ForgotPasswordForm
│   ├── dashboard/     StatsCard, RecentOrdersMock, SellerRankingMock
│   ├── common/        PoxpurLogo, PoxpurSpinner, ComingSoonPage,
│   │                  OfflineBanner, PWAUpdatePrompt
│   └── ui/            shadcn/ui components (14)
├── contexts/          AuthContext
├── hooks/             useAuth, useIsAdmin, useOnlineStatus
├── lib/               supabase, queryClient, env, utils, mocks
├── stores/            uiStore (Zustand: sidebarCollapsed, theme)
├── types/             database.ts
└── styles/            globals.css

supabase/migrations/   4 migrations versionadas (aplicadas via MCP)
scripts/               generate-pwa-icons.mjs
public/                favicon.svg + ícones PWA gerados
```

## Identidade visual Poxpur

Cores via CSS variables HSL em `src/styles/globals.css`:

- Navy primário: `#1B2C5E` (`var(--poxpur-navy)`)
- Verde Poxpur: `#8BC53F` (`var(--poxpur-green)`)
- Vermelho alerta: `#E63946` (`var(--poxpur-red)`)
- Fonte: **Inter Variable** (self-hosted via `@fontsource-variable/inter`)
- Cantos: `rounded-xl` (0.75rem)

Componentes shadcn/ui herdam essas cores via tokens semânticos (`--primary`, `--accent`, etc).

## Layout sem-scroll

Regra arquitetural: `<html>`, `<body>`, `#root` têm `height: 100vh; overflow: hidden`. **Scroll só acontece dentro do `<main>` interno do Shell**, nunca no documento. Garante UX consistente em viewport 1080p.

## RLS (Row Level Security)

Todas as tabelas em `poxpur` têm RLS habilitada:

- **`poxpur.profiles`**: qualquer authenticated lê; usuário atualiza só o próprio perfil; admin atualiza qualquer um.
- **`poxpur.audit_logs`**: só admin lê; cada user insere apenas logs com `user_id = auth.uid()`. Imutáveis (sem UPDATE/DELETE).

Função utilitária `poxpur.is_admin()` pra reuso em policies de outras tabelas (Ondas 2+).

## PWA

Manifest + Service Worker via vite-plugin-pwa. Caching:
- Fontes Inter: CacheFirst (1 ano)
- Supabase REST: NetworkFirst com timeout 5s
- Shell (JS/CSS/HTML): pre-cached

App é instalável (ícone "+" na omnibox do Chrome desktop). Quando offline, `<OfflineBanner />` aparece no topo.

## Roadmap próximas ondas

Veja [`FUTURE-REQUIREMENTS.md`](./FUTURE-REQUIREMENTS.md):

- **Onda 2** — Pedidos + CRM + Dashboard real (aprovação admin, notificações)
- **Onda 3** — Chat WhatsApp + Meta Cloud API + n8n (resumo diário)
- **Onda 4** — Equipe (chat interno) + Tarefas
- **Onda 5** — Relatórios + Configurações + Onboarding + MFA

## Documentação interna

- [`docs/superpowers/specs/2026-05-21-poxpur-sales-hub-onda1-design.md`](./docs/superpowers/specs/2026-05-21-poxpur-sales-hub-onda1-design.md) — design da Onda 1
- [`docs/superpowers/plans/2026-05-21-poxpur-sales-hub-onda1.md`](./docs/superpowers/plans/2026-05-21-poxpur-sales-hub-onda1.md) — plano de execução

## Licença

Proprietário — Poxpur © 2026
