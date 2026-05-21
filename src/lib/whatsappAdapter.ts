import { supabase } from '@/lib/supabase';
import type { PoxpurMessage } from '@/types/database';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type SendTextInput = {
  conversationId: string;
  to: string;
  text: string;
};

export type SendMediaInput = {
  conversationId: string;
  to: string;
  mediaUrl: string;
  caption?: string;
  filename?: string;
  mimetype?: string;
};

export type SendReactionInput = {
  conversationId: string;
  to: string;
  whatsappMessageId: string;
  emoji: string;
};

export type DeleteMessageInput = {
  conversationId: string;
  to: string;
  whatsappMessageId: string;
};

export type WhatsappAdapter = {
  sendText(input: SendTextInput, senderId: string): Promise<PoxpurMessage>;
  sendImage(input: SendMediaInput, senderId: string): Promise<PoxpurMessage>;
  sendAudio(input: SendMediaInput, senderId: string): Promise<PoxpurMessage>;
  sendVideo(input: SendMediaInput, senderId: string): Promise<PoxpurMessage>;
  sendDocument(input: SendMediaInput, senderId: string): Promise<PoxpurMessage>;
  sendReaction(input: SendReactionInput, senderId: string): Promise<void>;
  deleteMessage(input: DeleteMessageInput, senderId: string): Promise<void>;
};

// ─── URLs do n8n ───────────────────────────────────────────────────────────────

const N8N_BASE = import.meta.env['VITE_N8N_BASE_URL'] as string | undefined;

const url = (path: string) => (N8N_BASE ? `${N8N_BASE.replace(/\/$/, '')}/${path}` : null);

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function insertOutboundMessage(args: {
  conversationId: string;
  senderId: string;
  tipo: PoxpurMessage['tipo'];
  conteudo: string;
  anexoUrl?: string;
  mediaMime?: string;
  mediaFilename?: string;
}): Promise<PoxpurMessage> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: args.conversationId,
      sender_type: 'vendedor',
      sender_id: args.senderId,
      tipo: args.tipo,
      conteudo: args.conteudo,
      anexo_url: args.anexoUrl ?? null,
      media_mime: args.mediaMime ?? null,
      media_filename: args.mediaFilename ?? null,
      metadata: { status: 'enviando', sent_via: N8N_BASE ? 'evolution-n8n' : 'mock' },
      lida: true,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as PoxpurMessage;
}

function fireWebhook(path: string, body: Record<string, unknown>, messageId?: string): void {
  const target = url(path);
  if (!target) {
    console.warn(`[whatsapp] VITE_N8N_BASE_URL não definida — webhook ${path} skipado`);
    return;
  }
  void fetch(target, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch((err) => {
    console.warn(`[whatsapp] webhook ${path} falhou:`, err);
    if (messageId) {
      void supabase
        .from('messages')
        .update({ metadata: { status: 'erro', error: String(err) } })
        .eq('id', messageId);
    }
  });
}

// ─── Mock adapter ──────────────────────────────────────────────────────────────

export const mockWhatsappAdapter: WhatsappAdapter = {
  async sendText({ conversationId, text }, senderId) {
    return insertOutboundMessage({ conversationId, senderId, tipo: 'texto', conteudo: text });
  },
  async sendImage({ conversationId, mediaUrl, caption }, senderId) {
    return insertOutboundMessage({
      conversationId,
      senderId,
      tipo: 'imagem',
      conteudo: caption || '[imagem]',
      anexoUrl: mediaUrl,
    });
  },
  async sendAudio({ conversationId, mediaUrl }, senderId) {
    return insertOutboundMessage({
      conversationId,
      senderId,
      tipo: 'audio',
      conteudo: '[áudio]',
      anexoUrl: mediaUrl,
    });
  },
  async sendVideo({ conversationId, mediaUrl, caption }, senderId) {
    return insertOutboundMessage({
      conversationId,
      senderId,
      tipo: 'documento',
      conteudo: caption || '[vídeo]',
      anexoUrl: mediaUrl,
    });
  },
  async sendDocument({ conversationId, mediaUrl, filename, caption }, senderId) {
    return insertOutboundMessage({
      conversationId,
      senderId,
      tipo: 'documento',
      conteudo: caption || filename || '[documento]',
      anexoUrl: mediaUrl,
      mediaFilename: filename,
    });
  },
  async sendReaction({ whatsappMessageId, emoji }, senderId) {
    await supabase.rpc('upsert_message_reaction', {
      p_whatsapp_message_id: whatsappMessageId,
      p_by: `vendedor:${senderId}`,
      p_emoji: emoji,
    });
  },
  async deleteMessage({ whatsappMessageId }) {
    await supabase
      .from('messages')
      .update({ metadata: { deleted: true, deleted_at: new Date().toISOString() } })
      .eq('whatsapp_message_id', whatsappMessageId);
  },
};

// ─── Evolution + n8n adapter (produção) ────────────────────────────────────────

export const evolutionN8nAdapter: WhatsappAdapter = {
  async sendText({ conversationId, to, text }, senderId) {
    const msg = await insertOutboundMessage({
      conversationId,
      senderId,
      tipo: 'texto',
      conteudo: text,
    });
    fireWebhook('poxpur-send-text', { messageId: msg.id, conversationId, to, text }, msg.id);
    return msg;
  },
  async sendImage({ conversationId, to, mediaUrl, caption, mimetype }, senderId) {
    const msg = await insertOutboundMessage({
      conversationId,
      senderId,
      tipo: 'imagem',
      conteudo: caption || '[imagem]',
      anexoUrl: mediaUrl,
      mediaMime: mimetype,
    });
    fireWebhook(
      'poxpur-send-media',
      { messageId: msg.id, conversationId, to, mediaType: 'image', mediaUrl, caption },
      msg.id,
    );
    return msg;
  },
  async sendAudio({ conversationId, to, mediaUrl, mimetype }, senderId) {
    const msg = await insertOutboundMessage({
      conversationId,
      senderId,
      tipo: 'audio',
      conteudo: '[áudio]',
      anexoUrl: mediaUrl,
      mediaMime: mimetype,
    });
    fireWebhook(
      'poxpur-send-media',
      { messageId: msg.id, conversationId, to, mediaType: 'audio', mediaUrl },
      msg.id,
    );
    return msg;
  },
  async sendVideo({ conversationId, to, mediaUrl, caption, mimetype }, senderId) {
    const msg = await insertOutboundMessage({
      conversationId,
      senderId,
      tipo: 'documento',
      conteudo: caption || '[vídeo]',
      anexoUrl: mediaUrl,
      mediaMime: mimetype,
    });
    fireWebhook(
      'poxpur-send-media',
      { messageId: msg.id, conversationId, to, mediaType: 'video', mediaUrl, caption },
      msg.id,
    );
    return msg;
  },
  async sendDocument({ conversationId, to, mediaUrl, filename, caption, mimetype }, senderId) {
    const msg = await insertOutboundMessage({
      conversationId,
      senderId,
      tipo: 'documento',
      conteudo: caption || filename || '[documento]',
      anexoUrl: mediaUrl,
      mediaFilename: filename,
      mediaMime: mimetype,
    });
    fireWebhook(
      'poxpur-send-media',
      {
        messageId: msg.id,
        conversationId,
        to,
        mediaType: 'document',
        mediaUrl,
        caption,
        filename,
      },
      msg.id,
    );
    return msg;
  },
  async sendReaction({ to, whatsappMessageId, emoji }, senderId) {
    // Update DB primeiro (otimista)
    await supabase.rpc('upsert_message_reaction', {
      p_whatsapp_message_id: whatsappMessageId,
      p_by: `vendedor:${senderId}`,
      p_emoji: emoji,
    });
    fireWebhook('poxpur-react', { to, whatsappMessageId, emoji });
  },
  async deleteMessage({ to, whatsappMessageId }) {
    fireWebhook('poxpur-delete', { to, whatsappMessageId });
    // n8n vai responder e o app pode deixar UI marcar como deletada
    await supabase
      .from('messages')
      .update({ metadata: { deleted: true, deleted_at: new Date().toISOString() } })
      .eq('whatsapp_message_id', whatsappMessageId);
  },
};

// ─── Adapter ativo (auto-switch via env) ──────────────────────────────────────

export const whatsapp: WhatsappAdapter = N8N_BASE ? evolutionN8nAdapter : mockWhatsappAdapter;

// ─── Dev helper ────────────────────────────────────────────────────────────────

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

// ─── User invitation helper ────────────────────────────────────────────────────

export async function inviteUser(args: {
  email: string;
  nome?: string;
  role: 'admin' | 'vendedor';
  inviteName?: string;
}): Promise<{ invitation: { id: string; token: string; expires_at: string }; emailSent: boolean }> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome')
    .eq('id', user.user.id)
    .single();

  const { data, error } = await supabase
    .from('user_invitations')
    .insert({
      email: args.email,
      nome: args.nome ?? null,
      role: args.role,
      invited_by: user.user.id,
    })
    .select('id, token, expires_at')
    .single();
  if (error) throw error;

  const inviteLink = `${window.location.origin}/accept-invite?token=${data.token}`;
  const emailWebhook = url('poxpur-invite-user');
  let emailSent = false;
  if (emailWebhook) {
    try {
      const res = await fetch(emailWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: args.email,
          inviteName: args.inviteName ?? args.nome ?? '',
          invitedBy: profile?.nome ?? 'Equipe Poxpur',
          orgName: 'Poxpur',
          role: args.role === 'admin' ? 'Administrador' : 'Vendedor',
          inviteLink,
        }),
      });
      emailSent = res.ok;
    } catch (err) {
      console.warn('[invite] email send failed:', err);
    }
  }

  return { invitation: data as { id: string; token: string; expires_at: string }, emailSent };
}
