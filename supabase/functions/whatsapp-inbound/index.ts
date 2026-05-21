// Edge Function: whatsapp-inbound (v2)
// Recebe POST do n8n com mensagens recebidas da Evolution.
// Suporta: texto, mídia (imagem/vídeo/áudio/documento), reações.
//
// Auth: HMAC SHA256 com secret compartilhado OU service_role (fallback).
// Headers HMAC:
//   X-Timestamp: unix seconds
//   X-Signature: hmac_sha256(secret, timestamp + "." + body)

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';

type MessagePayload = {
  kind?: 'message';
  fromPhone: string;
  fromName?: string;
  text: string;
  whatsappMessageId?: string;
  type?: 'texto' | 'imagem' | 'audio' | 'documento' | 'localizacao' | 'template';
  mediaUrl?: string;
  anexoUrl?: string;
  mediaMime?: string;
  mediaFilename?: string;
  metadata?: Record<string, unknown>;
};

type ReactionPayload = {
  kind: 'reaction';
  reactedMessageId: string;
  emoji: string;
  fromPhone: string;
};

type InboundPayload = MessagePayload | ReactionPayload;

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const HMAC_SECRET = Deno.env.get('WHATSAPP_WEBHOOK_SECRET') || '';

function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
  return `+${digits}`;
}

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function validateHmac(req: Request, rawBody: string): boolean {
  if (!HMAC_SECRET) return false;
  const ts = req.headers.get('x-timestamp') || '';
  const sig = req.headers.get('x-signature') || '';
  if (!ts || !sig) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(ts, 10)) > 300) return false;
  const expected = createHmac('sha256', HMAC_SECRET).update(`${ts}.${rawBody}`).digest('hex');
  if (expected.length !== sig.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sig, 'hex'));
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json(405, { error: 'method not allowed' });

  const rawBody = await req.text();

  const auth = req.headers.get('authorization') || '';
  const apikey = req.headers.get('apikey') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  const hasServiceRole = token === SERVICE_KEY || apikey === SERVICE_KEY;
  const hasValidHmac = validateHmac(req, rawBody);

  if (!hasServiceRole && !hasValidHmac) {
    return json(401, { error: 'unauthorized' });
  }

  let payload: InboundPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json(400, { error: 'invalid json' });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    db: { schema: 'poxpur' },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (payload.kind === 'reaction') {
    if (!payload.reactedMessageId || payload.emoji === undefined) {
      return json(400, { error: 'reactedMessageId and emoji required' });
    }
    const by = `cliente:${normalizePhone(payload.fromPhone || 'unknown')}`;
    const { error: rpcErr } = await supabase.rpc('upsert_message_reaction', {
      p_whatsapp_message_id: payload.reactedMessageId,
      p_by: by,
      p_emoji: payload.emoji,
    });
    if (rpcErr) return json(500, { error: 'rpc failed', detail: rpcErr.message });
    return json(200, { reaction: 'ok', reactedMessageId: payload.reactedMessageId });
  }

  const msgPayload = payload as MessagePayload;
  if (!msgPayload.fromPhone) return json(400, { error: 'fromPhone required' });
  const phone = normalizePhone(msgPayload.fromPhone);
  if (!phone) return json(400, { error: 'invalid phone' });

  const text = msgPayload.text || (msgPayload.mediaUrl ? `[${msgPayload.type || 'midia'}]` : '');
  if (!text) return json(400, { error: 'text or mediaUrl required' });

  const { data: existingConv, error: convErr } = await supabase
    .from('conversations')
    .select('id, customer_id')
    .eq('customer_phone', phone)
    .eq('status', 'aberta')
    .order('ultima_mensagem_em', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (convErr) return json(500, { error: 'db error', detail: convErr.message });

  let conversationId = existingConv?.id;

  if (!conversationId) {
    const { data: customer } = await supabase
      .from('customers')
      .select('id, nome')
      .eq('telefone', phone)
      .maybeSingle();

    const { data: newConv, error: createErr } = await supabase
      .from('conversations')
      .insert({
        customer_id: customer?.id ?? null,
        customer_phone: phone,
        customer_nome_snapshot: customer?.nome ?? msgPayload.fromName ?? null,
        canal: 'whatsapp',
        status: 'aberta',
        assigned_to: null,
      })
      .select('id')
      .single();

    if (createErr || !newConv) {
      return json(500, { error: 'create conv failed', detail: createErr?.message });
    }
    conversationId = newConv.id;
  }

  if (msgPayload.whatsappMessageId) {
    const { data: existing } = await supabase
      .from('messages')
      .select('id')
      .eq('whatsapp_message_id', msgPayload.whatsappMessageId)
      .maybeSingle();
    if (existing) {
      return json(200, { conversationId, messageId: existing.id, deduplicated: true });
    }
  }

  const { data: msg, error: msgErr } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_type: 'cliente',
      sender_id: null,
      tipo: msgPayload.type ?? 'texto',
      conteudo: text,
      anexo_url: msgPayload.mediaUrl ?? msgPayload.anexoUrl ?? null,
      media_mime: msgPayload.mediaMime ?? null,
      media_filename: msgPayload.mediaFilename ?? null,
      whatsapp_message_id: msgPayload.whatsappMessageId ?? null,
      metadata: msgPayload.metadata ?? { source: 'evolution-n8n' },
      lida: false,
    })
    .select('id')
    .single();

  if (msgErr || !msg) {
    return json(500, { error: 'insert msg failed', detail: msgErr?.message });
  }

  return json(200, { conversationId, messageId: msg.id });
});
