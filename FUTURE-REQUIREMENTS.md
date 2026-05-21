# Future Requirements — Poxpur Sales Hub

Registro de requisitos que surgiram durante o brainstorming mas ficaram fora da Onda 1 (Fundação). Cada item indica em qual onda futura deve ser endereçado. Esta lista é atualizada conforme novas conversas com o usuário trazem ideias.

---

## Onda 2 — Pedidos + CRM + Dashboard real

### Fluxo de aprovação de pedidos pelo admin (★ pedido pelo usuário em 2026-05-21)

Todo pedido criado por vendedor entra com status `pendente_aprovacao`. Admin precisa aprovar, recusar ou editar antes do pedido avançar pra `aprovado` (e subsequente `enviado`, `concluido`).

- Status enum deve incluir `pendente_aprovacao`, `aprovado`, `recusado`, `enviado`, `concluido`, `cancelado`, e (ver abaixo) `aguardando_fabrica`.
- Vendedor não pode editar pedido após criação se status ≠ `pendente_aprovacao`.
- Admin tem ações: Aprovar, Recusar (com motivo obrigatório), Editar.
- Log em `poxpur.audit_logs` para cada decisão.

### Verificação de estoque

Ao admin aprovar um pedido, sistema checa estoque dos `order_items`:
- Se todos os itens têm `produto.estoque >= quantidade` → status vira `aprovado`.
- Se algum item não tem estoque suficiente → status vira `aguardando_fabrica`, dispara notificação extra ao admin.

Modelo de dados: `products.estoque` é INT, atualizado por triggers ao mudar status pra `enviado`.

### Notificações in-app (sininho no Header)

- Tabela `poxpur.notifications` (user_id, tipo, payload jsonb, lida, criado_em)
- Componente `<NotificationBell />` no Header com badge de não-lidas (real, não mais 0 fixo)
- Modal/popover lateral ao clicar mostra lista de notificações
- Tipos iniciais: `pedido_pendente_aprovacao`, `pedido_aguardando_fabrica`, `pedido_aprovado` (pro vendedor), `pedido_recusado` (pro vendedor)
- Supabase Realtime: inserir notificação → push imediato pra UI do destinatário

### Dashboard real

Substituir mocks de `src/lib/mocks.ts` por queries reais TanStack Query:
- StatsCards: aggregates SQL ou views
- Pedidos recentes: query com join customer + seller
- Ranking de vendedores: aggregate orders por seller_id no período
- Remover `// TODO Onda 2:` comentários

---

## Onda 3 — Chat WhatsApp + Integrações n8n

### Integração n8n para WhatsApp (★ pedido pelo usuário em 2026-05-21)

**Notificações em tempo real ao admin:**
- Webhook out: quando pedido fica `pendente_aprovacao` → POST pro n8n com payload → n8n manda WhatsApp pro número do admin (`poxpur.profiles.telefone` do role admin)
- Idem quando pedido vai pra `aguardando_fabrica`
- Mensagem rica: # pedido, cliente, vendedor, valor, link deep-link pro app

**Resumo diário automatizado:**
- n8n cron diário às 18:00 (timezone admin) executa query agregada
- Envia WhatsApp pro admin com KPIs: faturamento, # pedidos, # pendentes de aprovação, ranking parcial, alertas de estoque baixo
- Contexto: admin frequentemente viaja pra cidade da fábrica (matriz) por 2+ dias e precisa acompanhar remotamente
- Configurável via `poxpur.notification_preferences` (flag `recebe_resumo_diario`, hora preferida)

### Templates Meta WhatsApp

- Tabela `poxpur.whatsapp_templates` (nome, conteúdo, status_meta, criado_em)
- Necessários pra mensagens iniciadas pela empresa fora da janela de 24h
- Configuração no painel de Configurações (Onda 5)

### Modal "Criar Pedido a partir do chat"

O coração do produto. Modal complexo gradiente azul→verde, abre da thread de conversa com cliente pré-preenchido, vendedor pré-selecionado (logado), catálogo de produtos com busca, cálculos automáticos (subtotal, desconto, frete, total), forma de pagamento, prazo, observações, opção de vincular histórico do chat ao pedido pra auditoria.

---

## Onda 4 — Equipe (chat interno) + Tarefas

### Chat interno entre funcionários

- Canais públicos (Geral, Vendas, Avisos) criados pelo admin
- DMs entre usuários
- Status de presença (já temos enum `presence_status` na Onda 1, mas sem update em tempo real ainda)
- Menções `@nome` com notificação
- Compartilhar pedido/cliente como card embutido
- Fixar mensagens
- (v2) Chamadas de voz/vídeo via WebRTC/LiveKit ou Jitsi

### Tarefas

- Kanban (A fazer / Em andamento / Concluído) ou lista
- Atribuição admin→vendedor ou auto
- Prioridades, checklist de subtarefas, anexos, comentários
- Vínculo a pedido/cliente
- Notificações quando atribuída e quando concluída

---

## Onda 5 — Relatórios + Configurações + Onboarding + MFA

### Relatórios (admin)

- Recharts: vendas por vendedor, pedidos por status, faturamento mensal, funil de conversão, tempo médio de atendimento, produtos mais vendidos, clientes top
- Filtro global de período
- Exportação PDF/Excel

### Configurações

- Perfil da empresa (logo, CNPJ, endereço)
- Usuários (convidar por email, definir role, ativar/desativar, resetar senha)
- Catálogo de produtos CRUD
- Status de pedido customizáveis
- Templates WhatsApp
- Integração WhatsApp (token Meta, webhook URL)
- Preferências de notificação por canal (push, email, in-app, WhatsApp)
- Auditoria (log de ações sensíveis)
- Plano e cobrança (placeholder)

### Onboarding wizard

Primeiro acesso do admin: wizard configurando empresa, primeiro funcionário, integração WhatsApp.

### MFA

Opcional via Supabase Auth (TOTP).

### Dark mode polido

Refinar paleta dark, fazer auditoria visual em todos os componentes.

---

## Backlog sem onda definida

- **Modo mobile** (<1024px): atualmente fora do escopo. Revisar quando tablet/celular virar prioridade.
- **Fila offline de mutations**: PWA aguenta navegação offline, mas operações de escrita falham. Considerar `@tanstack/query-persist-client` + custom mutation queue.
- **Mensagens prontas no chat WhatsApp**: atalhos pra respostas frequentes.
- **Exportação de auditoria**: admin baixar logs por período.
- **Internacionalização** (i18n): hoje hard-coded em PT-BR. Adicionar `react-i18next` se virar requisito.

---

**Última atualização:** 2026-05-21 (brainstorming inicial; restaurado após acidente de scaffold)
