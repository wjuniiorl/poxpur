---
name: deploy-check
description: Roda validação completa antes de push pro main (typecheck + lint + build + smoke checks Supabase + verifica env vars). Use antes de cada deploy/commit grande para garantir que não vai quebrar produção no Vercel.
---

# Deploy check — Poxpur Sales Hub

Validação pré-deploy. Roda tudo que o Vercel vai rodar + extras de smoke test no Supabase.

## Sequência de checks

### 1. Working tree limpo?
```bash
cd "c:/Python/alex" && git status --porcelain
```
Reportar arquivos não-commitados. Não bloqueia, mas avisa.

### 2. Typecheck
```bash
cd "c:/Python/alex" && pnpm typecheck
```
Tem que dar 0 erros. Se falhar, mostrar os erros e PARAR.

### 3. Lint
```bash
cd "c:/Python/alex" && pnpm lint
```
0 warnings (config tem `--max-warnings 0`). Se falhar, mostrar e PARAR.

### 4. Build de produção
```bash
cd "c:/Python/alex" && pnpm build
```
Build success com chunks gerados em `dist/`. Olhar tamanhos suspeitos (>1MB chunk = code-split quebrado).

### 5. Smoke test do build local
```bash
cd "c:/Python/alex" && grep -c "xeondnsyfhhxkdpugmap" dist/assets/supabase-*.js 2>/dev/null
```
Se retornar 0, env var não está sendo injetada — vai dar tela branca em produção. PARAR.

### 6. Verifica Supabase advisors (security + performance)

Via MCP:
```
mcp__plugin_supabase_supabase__get_advisors
  project_id: xeondnsyfhhxkdpugmap
  type: security
```

Reportar issues críticos (RLS missing, function search_path, etc).

```
mcp__plugin_supabase_supabase__get_advisors
  project_id: xeondnsyfhhxkdpugmap
  type: performance
```

Reportar issues de performance (índices ausentes em FKs grandes, queries não usando índice, etc).

### 7. Confirma Edge Functions estão ACTIVE

Via MCP:
```
mcp__plugin_supabase_supabase__list_edge_functions
  project_id: xeondnsyfhhxkdpugmap
```

Verificar que `whatsapp-inbound` ainda está ACTIVE.

### 8. Confirma env vars no .env (smoke)

```bash
cd "c:/Python/alex" && test -f .env && grep -c "VITE_SUPABASE_URL\|VITE_SUPABASE_ANON_KEY\|VITE_N8N_BASE_URL" .env
```

Deve retornar 3 (ou ao menos 2 — VITE_N8N_BASE_URL é opcional pra dev em mock).

### 9. Lista commits que vão pro deploy

```bash
cd "c:/Python/alex" && git log origin/main..HEAD --oneline
```

Se vazio: nada pra deployar. Se >10 commits: revisar pra entender escopo.

## Output final

```markdown
# Deploy Check — Poxpur Sales Hub

## ✅ Pronto pra deploy
- Typecheck: 0 erros
- Lint: 0 warnings
- Build: success (N chunks, X KB total gzip)
- Env vars baked no bundle: ✓
- Supabase advisors: N security, N performance (todos OK ou listados)
- Edge functions: whatsapp-inbound ACTIVE
- Commits pendentes: N

## OU ⛔ Não deployar
[lista dos blockers + comandos pra corrigir]
```

## Quando o user pode pular esse check

- Mudança só em README/docs/markdown
- Mudança só em workflows n8n JSON (não afetam build)
- Mudança só em SQL migration que já foi aplicada (versionar apenas)

Caso contrário, **sempre rodar antes de `git push`**.
