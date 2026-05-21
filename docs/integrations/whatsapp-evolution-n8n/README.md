# Integração WhatsApp via Evolution API + n8n

Guia completo de setup. Tempo estimado: **15-20 minutos** se você já tem Evolution e n8n rodando.

## Arquitetura

```
┌──────────────┐  msgs do cliente   ┌──────┐   webhook       ┌──────────┐
│ WhatsApp     │ ─────────────────▶ │ Evo  │ ──────────────▶ │   n8n    │
│ do cliente   │                    │      │                 │(inbound) │
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

O workflow consolidado `poxpur-whatsapp.json` cobre: inbound de mensagens, outbound (texto + mídia + reações + delete), resumo diário cron e envio de emails de convite de usuário.

## Pré-requisitos

- Evolution API v2 rodando, com uma **instance criada** (anote o nome) e **conectada** (QR escaneado) com o WhatsApp da Poxpur
- n8n acessível em `https://n8n.escritoriowl.xyz` (já é o seu caso)
- Acesso ao **service_role key** do projeto Supabase Alex (`xeondnsyfhhxkdpugmap`)
- Edge Function `whatsapp-inbound` já está **deployada** neste projeto (foi feita junto com este setup)
- **n8n Community Node**: instale `n8n-nodes-evolution-api` via n8n → Settings → Community Nodes antes de importar o workflow

## Setup passo a passo

### 1. Variáveis de ambiente do n8n

No painel do n8n, vá em **Settings → Environment Variables** (ou edite o `.env` do container se for self-hosted via docker-compose) e adicione:

```
SUPABASE_URL=https://xeondnsyfhhxkdpugmap.supabase.co
EVOLUTION_BASE_URL=https://SEU-EVOLUTION.dominio.com
EVOLUTION_INSTANCE=nome-da-sua-instance
POXPUR_INVITE_FROM_EMAIL=no-reply@suaempresa.com
```

Opcionalmente, para validar HMAC no webhook de outbound:
```
WHATSAPP_WEBHOOK_SECRET=sua-chave-secreta-aqui
```

Se você usa o n8n via Docker, reinicie o container após editar.

### 2. Criar Credentials no n8n

Em **Credentials → + Add Credential**, crie as seguintes credentials:

**Credential A — "Supabase Service Role"** (tipo: HTTP Header Auth)
| Campo | Valor |
|-------|-------|
| Name | `Authorization` |
| Value | `Bearer eyJhbGciOiJI...` ← **service_role** key do Supabase |

Depois adicione um segundo header (clique "+ Add Header"):
| Name | Value |
|-------|-------|
| `apikey` | `eyJhbGciOiJI...` ← mesma **service_role** key |

> Use a **service_role**, NÃO a anon. Ela bypassa RLS — é necessário pra n8n escrever no schema poxpur.

Pegue em: Supabase Dashboard → Project Settings → API → **Project API keys** → `service_role` (clique no olho pra revelar).

**Credential B — "Evolution API Key"** (tipo: HTTP Header Auth)
| Campo | Valor |
|-------|-------|
| Name | `apikey` |
| Value | Sua **EVOLUTION_API_KEY** (a global, ou a da instance) |

**Credential C — SMTP** (tipo: SMTP)

Configure um credential SMTP para envio de emails de convite. Gmail funciona com App Password:
- Host: `smtp.gmail.com`, Port: `465`, SSL: `true`
- User: seu email Gmail, Password: App Password gerado em myaccount.google.com → Segurança → Senhas de app

### 3. Importar o workflow consolidado

No n8n, clique em **+ Workflow → Import from File** e importe:

- `poxpur-whatsapp.json` ← **workflow único consolidado**

Este workflow substitui os 3 workflows anteriores (01, 02, 03) e adiciona suporte a:
- Mídia (imagem, áudio, vídeo, documento)
- Reações de mensagem
- Delete de mensagem
- Convite de usuário (disparo de email)
- Resumo diário cron (18h)

> Os arquivos `01-inbound-evolution-to-supabase.json`, `02-outbound-app-to-evolution.json` e `03-daily-summary.json` estão mantidos na pasta apenas como **referência legada** — podem ser ignorados ou deletados em favor do workflow consolidado.

Após importar, para cada node do tipo **HTTP Request**, **SMTP** ou **Evolution** que pede credential:
- Selecione a Credential correta no dropdown
- Salve

### 4. Ativar o workflow e copiar as URLs de webhook

1. Clique **Activate** (toggle no topo direito)
2. Abra o node Webhook de inbound
3. Copie a **Production URL**. Algo como: `https://n8n.escritoriowl.xyz/webhook/poxpur-whatsapp-inbound`

Você também vai usar o base URL do n8n no `.env` do app.

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
      "events": ["MESSAGES_UPSERT", "MESSAGES_DELETE", "SEND_MESSAGE"]
    }
  }'
```

Ou via painel Evolution (Evolution Manager): **Instance → Settings → Webhook → URL** e selecione os eventos `messages.upsert`, `messages.delete`, `send.message`.

### 6. Adicionar a env var no app

Edite `.env` do Sales Hub (em `c:\Python\alex\.env`):

```
VITE_SUPABASE_URL=https://xeondnsyfhhxkdpugmap.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJI...
VITE_N8N_BASE_URL=https://n8n.escritoriowl.xyz/webhook
```

> `VITE_N8N_BASE_URL` é o **base URL** — o adapter concatena os paths específicos automaticamente (`/poxpur-send-text`, `/poxpur-send-media`, `/poxpur-react`, `/poxpur-delete`, `/poxpur-invite-user`).
>
> A variável antiga `VITE_N8N_OUTBOUND_WEBHOOK_URL` (URL completa de um único webhook) foi substituída por `VITE_N8N_BASE_URL`. Atualize seu `.env` se estiver migrando de uma versão anterior.

Reinicie o dev server (`pnpm dev`). O adapter detecta automaticamente que a env está definida e ativa o `evolutionN8nAdapter` no lugar do `mockWhatsappAdapter`.

### 7. Configurar Settings → Empresa

No app, login como admin → **Configurações → Empresa**:
- Preencha **WhatsApp Phone** com o número do admin que vai receber o resumo diário (formato `+5511999999999`)
- Marque **Recebe resumo diário** = true
- Salve

### 8. Testar end-to-end

**Teste 1 — Inbound:**
1. Pelo seu celular pessoal, mande uma mensagem WhatsApp pro número da Poxpur
2. Em segundos, deve aparecer no app na página **Chat WhatsApp**
3. Se não aparecer: olha os logs do workflow no n8n (clique no workflow → Executions)

**Teste 2 — Outbound texto:**
1. Login no app, abra uma conversa
2. Digite uma resposta e mande
3. Em segundos, deve chegar no seu celular

**Teste 3 — Mídia:**
1. No composer, clique no ícone de clipe (Paperclip)
2. Escolha "Imagem" e selecione um arquivo
3. O arquivo é upado pro Supabase Storage (`whatsapp-media` bucket) e enviado via n8n → Evolution

**Teste 4 — Reações:**
1. Passe o mouse sobre uma mensagem enviada pelo vendedor
2. Clique no ícone de emoji (Smile) e escolha uma reação
3. A reação aparece abaixo da bolha de mensagem

**Teste 5 — Delete:**
1. Passe o mouse sobre uma mensagem enviada pelo vendedor
2. Clique no ícone de lixeira e confirme
3. A mensagem vira "Mensagem apagada"

**Teste 6 — Convite de usuário:**
1. Configurações → Usuários → Convidar usuário
2. Preencha email, nome e role
3. O convite é criado no banco e um email é enviado via n8n (SMTP)
4. O convidado acessa o link `/accept-invite?token=...` e cria a conta

**Teste 7 — Resumo diário:**
1. No workflow, clique **Execute Workflow** pra disparar manualmente
2. Você deve receber no WhatsApp do admin uma mensagem com resumo

## Como funciona internamente

### Edge Function `whatsapp-inbound`

`supabase/functions/whatsapp-inbound/index.ts`

- Recebe POST com `{ fromPhone, fromName?, text, type?, whatsappMessageId?, anexoUrl?, mediaMime?, mediaFilename? }`
- Normaliza telefone (E.164 com +)
- Busca conversa aberta pelo `customer_phone` — se não acha, cria nova
- Idempotência: se `whatsappMessageId` já existe em `messages`, retorna sem duplicar
- Insere a message com `sender_type='cliente'`
- Trigger no DB atualiza `conversations.ultima_mensagem_em`, `nao_lidas`, `ultima_mensagem_preview`
- Realtime entrega pra UI

### Adapter `evolutionN8nAdapter`

`src/lib/whatsappAdapter.ts`

Quando o vendedor manda mensagem/mídia/reação na UI:
1. Para texto e mídia: insere imediatamente em `poxpur.messages` com `metadata.status='enviando'` — UI mostra o balão na hora
2. Fire-and-forget POST pro webhook do n8n com os parâmetros necessários
3. n8n chama Evolution, depois faz PATCH na message atualizando status
4. Realtime atualiza a UI

Para reações: chama o RPC `poxpur.upsert_message_reaction` diretamente + dispara webhook pro n8n.
Para delete: marca `metadata.deleted=true` no DB + dispara webhook pro n8n.

Se a env `VITE_N8N_BASE_URL` não estiver definida, cai automaticamente no `mockWhatsappAdapter` (útil em dev sem n8n).

### Storage de mídia

As mídias enviadas pelo vendedor são upadas pro bucket `whatsapp-media` no Supabase Storage (público para leitura, autenticado para upload). O helper `src/lib/uploadMedia.ts` cuida do upload e retorna a URL pública que é passada pro adapter.

### Convite de usuário

`src/lib/whatsappAdapter.ts` → `inviteUser()`

1. Cria linha em `poxpur.user_invitations` com token UUID único e validade de 7 dias
2. Dispara POST pro n8n (`poxpur-invite-user`) com os dados do convite
3. n8n envia email via SMTP com o link de aceite
4. O convidado acessa `/accept-invite?token=...`, cria senha e perfil
5. A linha `user_invitations` é atualizada para `status='aceito'`

### Trocando entre adapters

Por padrão a escolha é automática (baseada na env var). Pra forçar o mock mesmo com a env definida:

```ts
export const whatsapp: WhatsappAdapter = mockWhatsappAdapter; // força mock
```

## Segurança

- **Edge Function** valida que o caller tem service_role no header
- **Webhook outbound** tem URL com path randômico (UUID) como segredo implícito. Para segurança extra, adicione validação de `WHATSAPP_WEBHOOK_SECRET` como header customizado `X-Poxpur-Token`
- **Service role no n8n**: o n8n self-hosted no seu domínio é seguro o suficiente. Não exponha o workflow JSON em repos públicos com credentials

## Troubleshooting

| Sintoma | Causa provável | Como resolver |
|---------|----------------|----------------|
| Mensagem do cliente não aparece no app | Webhook Evolution não disparou | Verificar logs Evolution + Executions n8n |
| 401 unauthorized na Edge Function | Service role errada na Credential | Re-conferir a key (Bearer + apikey ambos) |
| Mensagem do vendedor não chega no WhatsApp | EVOLUTION_INSTANCE errada | Conferir nome exato da instance (case-sensitive) |
| Mensagem fica "enviando..." pra sempre | Webhook outbound não foi chamado | Conferir VITE_N8N_BASE_URL no .env e reiniciar dev |
| Mídia não sobe | Bucket não existe ou policy incorreta | Verificar bucket `whatsapp-media` no Supabase Storage |
| Email de convite não chega | SMTP não configurado no n8n | Criar credential SMTP e linkar no node de email |
| Resumo diário não envia | `recebe_resumo_diario=false` ou `whatsapp_phone` vazio | Configurações → Empresa, preencher e salvar |
| PGRST106 nos PATCH | Schema poxpur não exposto na API | Settings → API → Exposed schemas → adicionar poxpur |

## Arquivos relevantes

- `supabase/functions/whatsapp-inbound/index.ts` — Edge Function deployada
- `src/lib/whatsappAdapter.ts` — Adapter no front (texto, mídia, reações, delete, convite)
- `src/lib/uploadMedia.ts` — Helper de upload pro Supabase Storage
- `src/hooks/useReact.ts` — Hooks para reações, delete e envio de mídia
- `src/hooks/useInvitations.ts` — Hooks para listagem e cancelamento de convites
- `src/pages/AcceptInvite.tsx` — Página pública de aceite de convite
- `docs/integrations/whatsapp-evolution-n8n/poxpur-whatsapp.json` — Workflow consolidado (use este)
- `docs/integrations/whatsapp-evolution-n8n/01-inbound-evolution-to-supabase.json` — Legado (deprecado)
- `docs/integrations/whatsapp-evolution-n8n/02-outbound-app-to-evolution.json` — Legado (deprecado)
- `docs/integrations/whatsapp-evolution-n8n/03-daily-summary.json` — Legado (deprecado)
