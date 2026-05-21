# Poxpur Sales Hub

Sistema de gestão de equipe de vendas para representantes da Poxpur.

> **Status:** Onda 1 (Fundação) em desenvolvimento. Veja `docs/superpowers/specs/` para o design e `docs/superpowers/plans/` para o plano de execução.

## Stack

Vite + React 18 + TypeScript + Tailwind + shadcn/ui, com Supabase (Auth + Postgres com schema `poxpur` + RLS) como backend.

## Setup

```bash
pnpm install
pnpm dev
```

App roda em `http://localhost:5173`.

## Variáveis de ambiente

Crie `.env` na raiz baseado em `.env.example`:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## ⚠️ Configuração Supabase obrigatória

Após aplicar as migrations, é necessário expor o schema `poxpur` para a API:

1. Acesse o dashboard do projeto Supabase
2. Vá em **Settings → API**
3. Em **Exposed schemas**, adicione `poxpur` à lista (mantenha `public` que já está lá)
4. Salve

Sem isso, o cliente supabase-js não consegue acessar as tabelas.

## Credenciais de demonstração

Após rodar as seeds:
- `admin@poxpur.demo` / `Poxpur2026!` (admin)
- `joao@poxpur.demo` / `Poxpur2026!` (vendedor)
- `maria@poxpur.demo` / `Poxpur2026!` (vendedor)

## Scripts

| Comando | Descrição |
|---------|-----------|
| `pnpm dev` | Vite dev server |
| `pnpm build` | TypeCheck + build de produção |
| `pnpm preview` | Servir build de produção localmente |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier |
| `pnpm supabase:types` | Regenera tipos TS do schema poxpur |
