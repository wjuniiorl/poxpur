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
   * Send a message via WhatsApp. Real implementation calls Meta Cloud API.
   * Returns the whatsapp_message_id (real) or a fake id (mock).
   * Both implementations also insert the row into poxpur.messages.
   */
  sendText(input: SendMessageInput, senderId: string): Promise<PoxpurMessage>;
};

// ─── Mock Adapter ──────────────────────────────────────────────────────────────

/**
 * Mock adapter: does NOT call Meta. Just inserts the message in DB
 * with a fake whatsapp_message_id. Realtime delivers it to the UI.
 *
 * To switch to real Meta API:
 * 1. Implement `metaWhatsappAdapter` with the same interface.
 * 2. Use a Supabase Edge Function as the webhook endpoint (inserts incoming).
 * 3. Replace export below.
 */
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

// ─── Active adapter (swap here to use real Meta API) ──────────────────────────

export const whatsapp: WhatsappAdapter = mockWhatsappAdapter;

// ─── Dev helper: simulate incoming client message ─────────────────────────────

/**
 * Dev/demo helper. Simulates an incoming client WhatsApp message.
 * Used by the "Simular resposta do cliente" button in the UI.
 * Remove or guard this in production builds.
 */
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
