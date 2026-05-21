# Integração WhatsApp via Evolution API + n8n

Guia completo de setup. Tempo estimado: **15-20 minutos** se você já tem Evolution e n8n rodando.

## Arquitetura

```
┌──────────────┐  msgs do cliente   ┌──────┐   webhook       ┌──────────┐
│ WhatsApp     │ ─────────────────▶ │ Evo  │ ──────────────▶ │   n8n    │
│ do cliente   │                    │      │                 │ (inbound)│
└──────────────┘                    └──────┘                 └─────┬────┘
                                                                   │ POST
                                                                   ▼
                                                       ┌─────────────────────┐
                                                       │ Edge Function       │
                                                       │ whatsapp-inbound    │
                                                       │  (poxpur schema)    │
                                                       └─────────┬───────────┘
                                                                 │ insert
                                                                 ▼
                                                       ┌─────────────────────┐
                                                       │ poxpur.conversations│ ── Realtime ──┐
                                                       │ poxpur.messages     │               │
                                                       └─────────────────────┘               ▼
                                                                                    ┌────────────────┐
                                                                                    │ Sales Hub UI   │
                                                                                    │ (chat WhatsApp)│
                                                                                    └───────┬────────┘
                                                                                            │ vendedor
                                                                                            │ envia
                                                                                            ▼
┌──────────────┐  ← Evolution    ┌──────┐   ← n8n PATCH    ┌──────────┐                ┌──────────┐
│ WhatsApp     │ ◀────────────── │ Evo  │ ◀────────────── │   n8n    │ ◀──── POST ──── │  App     │
│ do cliente   │                 │      │                 │(outbound)│   webhook       │ (adapter)│
└──────────────┘                 └──────┘                 └──────────┘                 └──────────┘
```

Mais um workflow cron 18h pra resumo diário direto do Supabase pra Evolution → admin.

## Pré-requisitos

- Evolution API v2 rodando, com uma **instance criada** (anote o nome) e **conectada** (QR escaneado) com o WhatsApp da Poxpur
- n8n acessível em `https://n8n.escritoriowl.xyz` (já é o seu caso)
- Acesso ao **service_role key** do projeto Supabase Alex (`xeondnsyfhhxkdpugmap`)
- Edge Function `whatsapp-inbound` já está **deployada** neste projeto (foi feita junto com este setup)

## Setup passo a passo

### 1. Variáveis de ambiente do n8n

No painel do n8n, vá em **Settings → Environment Variables** (ou edite o `.env` do container se for self-hosted via docker-compose) e adicione:

```
SUPABASE_URL=https://xeondnsyfhhxkdpugmap.supabase.co
EVOLUTION_BASE_URL=https://SEU-EVOLUTION.dominio.com
EVOLUTION_INSTANCE=nome-da-sua-instance
```

Se você usa o n8n via Docker, reinicie o container após editar.

### 2. Criar Credentials no n8n

Em **Credentials → + Add Credential**, crie 2 credentials do tipo **HTTP Header Auth**:

**Credential A — "Supabase Service Role"**
| Campo | Valor |
|-------|-------|
| Name | `Authorization` |
| Value | `Bearer eyJhbGciOiJI...` ← **service_role** key do Supabase |

Depois, no mesmo Credential, adicione um segundo header (clique "+ Add Header"):
| Name | Value |
|-------|-------|
| `apikey` | `eyJhbGciOiJI...` ← mesma **service_role** key |

> ⚠️ Use a **service_role**, NÃO a anon. Ela bypassa RLS — é necessário pra n8n escrever no schema poxpur.

Pegue ela em: Supabase Dashboard → Project Settings → API → **Project API keys** → `service_role` (clique no olho pra revelar).

**Credential B — "Evolution API Key"**
| Campo | Valor |
|-------|-------|
| Name | `apikey` |
| Value | Sua **EVOLUTION_API_KEY** (a global, ou a da instance) |

### 3. Importar os 3 workflows

No n8n, clique em **+ Workflow → Import from File** e importe um a um:

1. `01-inbound-evolution-to-supabase.json`
2. `02-outbound-app-to-evolution.json`
3. `03-daily-summary.json`

Cada workflow tem o campo `credentials.httpHeaderAuth.id` apontando pra `REPLACE_WITH_CREDENTIAL_ID`. Depois de importar:

- Abra cada node do tipo **HTTP Request** ou **Webhook** que tem `Authentication: Header Auth`
- Selecione a Credential correta no dropdown (Supabase Service Role ou Evolution API Key)
- Salve

### 4. Ativar os workflows e copiar as URLs de webhook

Pra cada workflow:
1. Clique **Activate** (toggle no topo direito)
2. Abra o node Webhook
3. Copie a **Production URL** (não a Test URL)

Você vai precisar de 2 URLs:

- **Inbound URL** (workflow 1): vai no Evolution. Algo como `https://n8n.escritoriowl.xyz/webhook/poxpur-whatsapp-inbound`
- **Outbound URL** (workflow 2): vai no `.env` do app. Algo como `https://n8n.escritoriowl.xyz/webhook/poxpur-whatsapp-outbound`

(Workflow 3 é cron, não precisa de URL.)

### 5. Configurar webhook na Evolution

Configure a Evolution pra disparar webhook na sua instance.

Via **API call** (recomendado — funciona em qualquer versão):

```bash
curl -X POST 'https://SEU-EVOLUTION.dominio.com/webhook/set/nome-da-sua-instance' \
  -H 'apikey: SUA_EVOLUTION_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "webhook": {
      "enabled": true,
      "url": "https://n8n.escritoriowl.xyz/webhook/poxpur-whatsapp-inbound",
      "byEvents": false,
      "base64": false,
      "events": ["MESSAGES_UPSERT"]
    }
  }'
```

Ou via painel Evolution (Evolution Manager): **Instance → Settings → Webhook → URL** e selecione apenas o evento `messages.upsert` (ou `MESSAGES_UPSERT`).

### 6. Adicionar a env var no app

Edite `.env` do Sales Hub (em `c:\Python\alex\.env`):

```
VITE_SUPABASE_URL=https://xeondnsyfhhxkdpugmap.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJI...
VITE_N8N_OUTBOUND_WEBHOOK_URL=https://n8n.escritoriowl.xyz/webhook/poxpur-whatsapp-outbound
```

Reinicie o dev server (`pnpm dev`). O adapter detecta automaticamente que a env está definida e ativa o `evolutionN8nAdapter` no lugar do `mockWhatsappAdapter`.

### 7. Configurar Settings → Empresa

No app, login como admin → **Configurações → Empresa**:
- Preencha **WhatsApp Phone** com o número do admin que vai receber o resumo diário (formato `+5511999999999`)
- Marque **Recebe resumo diário** = true
- Salve

### 8. Testar end-to-end

**Teste 1 — Inbound:**
1. Pelo seu celular pessoal, mande uma mensagem WhatsApp pro número da Poxpur
2. Em segundos, deve aparecer no app na página **Chat WhatsApp** (cria conversa nova ou aproveita existente se já tem cliente cadastrado com esse telefone)
3. Se não aparecer: olha os logs do workflow 1 no n8n (clique no workflow → Executions). Erros comuns:
   - 401 unauthorized → service_role errada
   - 400 invalid phone → formato do telefone na Evolution diferente do esperado (pouco provável em v2)

**Teste 2 — Outbound:**
1. Login no app como admin (ou joão se a conversa estiver atribuída a ele)
2. Abra a conversa do passo 1
3. Digite uma resposta e mande
4. Em segundos, deve chegar no seu celular pessoal
5. No app, a mensagem que era "enviando..." vira "enviada" (metadata.status muda — atualiza via Realtime)
6. Se falhar: olha logs do workflow 2 no n8n

**Teste 3 — Resumo diário:**
1. No workflow 3, clique **Execute Workflow** (botão de play) pra disparar manualmente sem esperar 18h
2. Você deve receber no WhatsApp do admin uma mensagem com resumo
3. Se vier vazio ou com erro: confira `recebe_resumo_diario=true` e `whatsapp_phone` preenchido em company_settings

## Como funciona internamente

### Edge Function `whatsapp-inbound`

`supabase/functions/whatsapp-inbound/index.ts`

- Recebe POST com `{ fromPhone, fromName?, text, type?, whatsappMessageId?, anexoUrl? }`
- Normaliza telefone (E.164 com +)
- Busca conversa aberta pelo `customer_phone` — se não acha, cria nova (tentando linkar com customer existente que tenha esse telefone cadastrado)
- Idempotência: se `whatsappMessageId` já existe em `messages`, retorna sem duplicar (Evolution às vezes reenvia o mesmo evento)
- Insere a message com `sender_type='cliente'`
- Trigger no DB atualiza `conversations.ultima_mensagem_em`, `nao_lidas`, `ultima_mensagem_preview`
- Realtime entrega pra UI

### Adapter `evolutionN8nAdapter`

`src/lib/whatsappAdapter.ts`

Quando o vendedor manda mensagem na UI:
1. Insere imediatamente em `poxpur.messages` com `metadata.status='enviando'` — UI mostra o balão na hora
2. Fire-and-forget POST pro webhook outbound do n8n com `{ messageId, conversationId, to, text }`
3. n8n chama Evolution, depois faz PATCH na message setando `whatsapp_message_id` real + `metadata.status='enviado'`
4. Realtime atualiza a UI

Se a env `VITE_N8N_OUTBOUND_WEBHOOK_URL` não estiver definida, cai automaticamente no `mockWhatsappAdapter` (útil em dev sem n8n).

### Trocando entre adapters

Por padrão a escolha é automática (baseada na env var). Pra forçar o mock mesmo com a env definida, edite `src/lib/whatsappAdapter.ts`:

```ts
export const whatsapp: WhatsappAdapter = mockWhatsappAdapter; // força mock
```

## Segurança

- **Edge Function** valida que o caller tem service_role no header — só o n8n (que tem a key) consegue chamar
- **Workflow 2 (outbound)** é aberto na internet (webhook público do n8n) — qualquer um que ache a URL pode mandar mensagem. Mitigação: a URL é gerada pelo n8n com um path randômico e longa (UUID), funciona como "secret in URL". Pra segurança extra, adicione validação de header customizado no primeiro node do workflow (ex.: `X-Poxpur-Token` que o app envia).
- **Service role no n8n**: o n8n self-hosted no seu domínio é seguro o suficiente. Não exponha o workflow JSON em repos públicos com a credential id apontando.

## Troubleshooting

| Sintoma | Causa provável | Como resolver |
|---------|----------------|----------------|
| Mensagem do cliente não aparece no app | Webhook Evolution não disparou | Verificar logs Evolution + Executions n8n |
| 401 unauthorized na Edge Function | Service role errada na Credential | Re-conferir a key (Bearer + apikey ambos) |
| Mensagem do vendedor não chega no WhatsApp | EVOLUTION_INSTANCE errada | Conferir nome exato da instance (case-sensitive) |
| Mensagem fica "enviando..." pra sempre | Webhook outbound não foi chamado | Conferir VITE_N8N_OUTBOUND_WEBHOOK_URL no .env e reiniciar dev |
| Resumo diário não envia | `recebe_resumo_diario=false` ou `whatsapp_phone` vazio | Configurações → Empresa, preencher e salvar |
| PGRST106 nos PATCH | Schema poxpur não exposto na API | Settings → API → Exposed schemas → adicionar poxpur |

## Arquivos relevantes

- `supabase/functions/whatsapp-inbound/index.ts` — Edge Function deployada
- `src/lib/whatsappAdapter.ts` — Adapter no front
- `docs/integrations/whatsapp-evolution-n8n/01-inbound-evolution-to-supabase.json` — Workflow 1
- `docs/integrations/whatsapp-evolution-n8n/02-outbound-app-to-evolution.json` — Workflow 2
- `docs/integrations/whatsapp-evolution-n8n/03-daily-summary.json` — Workflow 3
