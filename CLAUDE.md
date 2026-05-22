# Poxpur Sales Hub — Contexto pro Claude

Sistema de gestão de equipe de vendas para representantes da Poxpur. SPA React + TS com Supabase, integrado a WhatsApp via Evolution+n8n.

## Stack

- **Front**: Vite 8 + React 19 + TypeScript strict + Tailwind 3 + shadcn/ui
- **State**: TanStack Query 5 + Zustand + React Context (auth)
- **Forms**: react-hook-form + zod
- **Backend**: Supabase Cloud (`xeondnsyfhhxkdpugmap`) — Postgres com schema dedicado `poxpur` + RLS habilitada + Edge Functions + Realtime + Storage
- **Integrações**: n8n (`https://webhook.escritoriowl.xyz/webhook`) + Evolution API (instance `escritorio-wl`) + SMTP
- **Deploy**: Vercel (auto-deploy via push pro `main`)
- **Pacote**: pnpm 11, Node 22

## Convenções críticas

### Schema do banco

- **Schema é `poxpur`**, NÃO `public`. Compartilha projeto Supabase com outro app — não causar colisão.
- Cliente do front: `supabase.from('messages')` → automaticamente aponta pra `poxpur.messages` (configurado em `db.schema: 'poxpur'`).
- Pra n8n usar via REST: precisa do header `Accept-Profile: poxpur` (ou usar views espelho em `public` como `public.poxpur_messages`).
- **Sempre habilitar RLS** ao criar tabela nova. Toda tabela tem `criado_em timestamptz default now()` e algumas `atualizado_em` com trigger.
- Função utilitária `poxpur.is_admin()` retorna boolean — use em policies pra dar bypass admin.
- Reaplicar migrations sempre via MCP `apply_migration` (não usar CLI local). Versionar SQL em `supabase/migrations/`.

### Auth

- Login email+senha via Supabase Auth. Tabela `poxpur.profiles` é linked com `auth.users` (mesmo UUID).
- AuthContext (`src/contexts/AuthContext.tsx`) bootstrap: `getSession` → loadProfile → status `loading|authenticated|no_profile|unauthenticated`.
- Sem trigger automático de signup → profile. Perfis criados via convite admin (`user_invitations`).
- 3 seed users demo: `admin@poxpur.demo`, `joao@poxpur.demo`, `maria@poxpur.demo` (senha `Poxpur2026!`).

### Joins PostgREST que NÃO funcionam

- `orders.seller_id` e `conversations.assigned_to` referenciam `auth.users(id)`, NÃO `poxpur.profiles(id)`.
- PostgREST NÃO consegue fazer embed automático `seller:profiles!orders_seller_id_fkey(...)` — retorna 400.
- **Pattern correto**: fetch separado de profiles pelos ids e merge client-side. Veja helpers `mergeSellers` em `useOrders.ts` e `mergeAssignees` em `useConversations.ts`.

### Layout

- Regra: **sem scroll no body**. `<html>`, `<body>`, `#root` têm `height: 100vh; overflow: hidden`. Scroll só no `<main>` interno do Shell.
- Sidebar fixa esquerda (w-60 ou w-16 collapsed), Header fixo h-14, main flex-1 overflow-y-auto.

### Cores Poxpur (CSS vars HSL em `globals.css`)

- Navy: `hsl(var(--poxpur-navy))` = `#1B2C5E` — primário, sidebar
- Verde: `hsl(var(--poxpur-green))` = `#8BC53F` — CTAs, destaque
- Vermelho: `hsl(var(--poxpur-red))` = `#E63946` — alertas
- Tokens shadcn (`--primary`, `--accent`, etc) já mapeados pra paleta Poxpur.

### WhatsApp (Evolution + n8n)

- **Adapter** em `src/lib/whatsappAdapter.ts`. Auto-switch: se `VITE_N8N_BASE_URL` definida → real adapter; senão → mock.
- Outbound: app POSTa webhook n8n com `{messageId, conversationId, to, text}` → n8n chama Evolution → PATCH messages status.
- Inbound: Evolution → webhook n8n → RPC `public.poxpur_inbound_message` (ou Edge Function `whatsapp-inbound` legacy).
- Reactions: RPC `public.poxpur_inbound_reaction`.
- Configuração detalhada em `docs/integrations/whatsapp-evolution-n8n/README.md`.

### PWA temporariamente desabilitado

- `vite.config.ts` tem `VitePWA({ disable: true })` por enquanto.
- Kill switch inline no `index.html` + main.tsx desregistra SW antigos.
- Página `/reset.html` estática pra emergência.
- Razão: primeiro deploy serviu `/sw.js` com cache immutable 1 ano → SW velho ficava preso nos navegadores. Reativar quando estratégia de cache estiver robusta.

## Comandos comuns

```bash
pnpm dev              # dev server
pnpm typecheck        # tsc --noEmit
pnpm lint             # eslint --max-warnings 0
pnpm build            # typecheck + Vite build
pnpm preview          # serve dist/ local

git push              # → Vercel auto-deploy (main)
```

## Não fazer

- Não usar schema `public` direto pra tabelas do app (compartilha com outro projeto).
- Não criar trigger `auth.users → poxpur.profiles` no signup (perfis só via convite admin).
- Não fazer joins PostgREST com `profiles!orders_seller_id_fkey` (vai dar 400).
- Não rodar `pnpm create vite . --overwrite` ou flags destrutivas em scaffolding (já apagou `.env` no passado).
- Não fazer commit de `.env` ou de service_role keys (gitignored).
- Não habilitar PWA `disable: false` sem antes resolver a estratégia de cache do SW.

## Tags publicadas

- `v0.1.0-onda1` Fundação (auth + layout + 8 rotas + seeds)
- `v0.2.0-onda2` Pedidos + CRM + Catálogo + Notificações
- `v0.3.0-onda3` Chat WhatsApp UI + modal "Criar Pedido a partir do chat"
- `v0.4.0-onda4` Tarefas + Equipe (chat interno)
- `v0.5.0-onda5` Relatórios (Recharts) + Settings completo
- `v0.6.0-whatsapp-integration` Evolution+n8n básico
- `v0.7.0-whatsapp-pro` Mídia + reações + delete + convite SMTP
- `v0.8.0-saas-polish` Command Palette + ConnectionStatus + code-split

## Documentação

- `docs/superpowers/specs/2026-05-21-poxpur-sales-hub-onda1-design.md` — design original
- `docs/integrations/whatsapp-evolution-n8n/README.md` — setup WhatsApp completo
- `FUTURE-REQUIREMENTS.md` — backlog pós-Onda 1 (várias coisas já foram entregues)
