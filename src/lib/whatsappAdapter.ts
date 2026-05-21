import { supabase } from '@/lib/supabase';
import type { PoxpurMessage } from '@/types/database';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type SendMessageInput = {
  conversationId: string;
  to: string; // E.164 phone, e.g. +5511...
  text: string;
};

export type WhatsappAdapter = {
  /**
   * Envia mensagem via WhatsApp.
   * Insere a row em poxpur.messages com metadata.status = 'enviando'.
   * Quando a Evolution confirma entrega (via n8n), n8n faz PATCH atualizando
   * metadata.status = 'enviado' e preenchendo whatsapp_message_id real.
   */
  sendText(input: SendMessageInput, senderId: string): Promise<PoxpurMessage>;
};

// ─── Mock Adapter (default em dev sem n8n configurado) ────────────────────────

export const mockWhatsappAdapter: WhatsappAdapter = {
  async sendText({ conversationId, text }, senderId) {
    const fakeId = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'vendedor',
        sender_id: senderId,
        tipo: 'texto',
        conteudo: text,
        whatsapp_message_id: fakeId,
        lida: true,
        metadata: { mock: true, sent_via: 'mock-adapter' },
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as PoxpurMessage;
  },
};

// ─── Evolution + n8n Adapter (produção) ───────────────────────────────────────
//
// Como funciona:
// 1. Insere mensagem em messages com metadata.status='enviando' (UI mostra spinner)
// 2. POST fire-and-forget para o webhook outbound do n8n com { messageId, to, text }
// 3. n8n recebe → chama Evolution API → ao receber resposta:
//    - sucesso: PATCH messages SET metadata.status='enviado', whatsapp_message_id=<evo_id>
//    - falha:   PATCH messages SET metadata.status='erro', metadata.error=<msg>
// 4. Supabase Realtime entrega o update pra UI automaticamente
//
// A URL do webhook é lida da env var VITE_N8N_OUTBOUND_WEBHOOK_URL.
// Se a env não estiver definida, cai no mock automaticamente.

const N8N_OUTBOUND_URL = import.meta.env['VITE_N8N_OUTBOUND_WEBHOOK_URL'] as string | undefined;

export const evolutionN8nAdapter: WhatsappAdapter = {
  async sendText({ conversationId, to, text }, senderId) {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'vendedor',
        sender_id: senderId,
        tipo: 'texto',
        conteudo: text,
        whatsapp_message_id: null,
        lida: true,
        metadata: { status: 'enviando', sent_via: 'evolution-n8n' },
      })
      .select('*')
      .single();
    if (error) throw error;
    const msg = data as PoxpurMessage;

    if (!N8N_OUTBOUND_URL) {
      console.warn('[whatsapp] VITE_N8N_OUTBOUND_WEBHOOK_URL não definida — mensagem ficará pendente');
      return msg;
    }

    // Fire-and-forget — não bloqueia a UI esperando Evolution
    void fetch(N8N_OUTBOUND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId: msg.id, conversationId, to, text }),
    }).catch((err) => {
      console.warn('[whatsapp] falha ao chamar webhook n8n:', err);
      // Atualiza metadata pra refletir erro mesmo se a chamada nem saiu
      void supabase
        .from('messages')
        .update({ metadata: { status: 'erro', error: String(err) } })
        .eq('id', msg.id);
    });

    return msg;
  },
};

// ─── Adapter ativo ─────────────────────────────────────────────────────────────
//
// Escolha automática: se VITE_N8N_OUTBOUND_WEBHOOK_URL estiver definida, usa
// o adapter real (Evolution via n8n). Caso contrário, cai no mock pra dev.

export const whatsapp: WhatsappAdapter = N8N_OUTBOUND_URL
  ? evolutionN8nAdapter
  : mockWhatsappAdapter;

// ─── Dev helper: simular mensagem do cliente ───────────────────────────────────
//
// Usado pelo botão "Simular resposta do cliente" no ChatThread durante demos.
// Em produção, mensagens do cliente entram pela Edge Function whatsapp-inbound.

export async function simulateIncomingClientMessage(
  conversationId: string,
  text: string,
): Promise<PoxpurMessage> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_type: 'cliente',
      sender_id: null,
      tipo: 'texto',
      conteudo: text,
      whatsapp_message_id: `mock-incoming-${Date.now()}`,
      lida: false,
      metadata: { mock: true, source: 'simulated-incoming' },
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as PoxpurMessage;
}
