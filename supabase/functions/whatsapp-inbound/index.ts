// Edge Function: whatsapp-inbound
// Recebe POST do n8n quando a Evolution dispara webhook de mensagem recebida.
// Identifica conversa (cria se necessário), insere mensagem, retorna IDs.
//
// Auth: requer service_role no header Authorization (n8n usa Credential).
// Body JSON esperado:
// {
//   "fromPhone": "+5511999999999",
//   "fromName": "Cliente",
//   "text": "mensagem",
//   "whatsappMessageId": "evolution-msg-id",
//   "type": "texto" | "imagem" | "audio" | "documento" | "localizacao",
//   "anexoUrl": "https://..." (opcional)
// }

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

type InboundPayload = {
  fromPhone: string;
  fromName?: string;
  text: string;
  whatsappMessageId?: string;
  type?: 'texto' | 'imagem' | 'audio' | 'documento' | 'localizacao' | 'template';
  anexoUrl?: string;
  metadata?: Record<string, unknown>;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
  return `+${digits}`;
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return jsonResponse(405, { error: 'method not allowed' });

  const auth = req.headers.get('authorization') || '';
  const apikey = req.headers.get('apikey') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (token !== SERVICE_KEY && apikey !== SERVICE_KEY) {
    return jsonResponse(401, { error: 'unauthorized' });
  }

  let payload: InboundPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { error: 'invalid json' });
  }

  if (!payload.fromPhone || !payload.text) {
    return jsonResponse(400, { error: 'fromPhone and text required' });
  }

  const phone = normalizePhone(payload.fromPhone);
  if (!phone) return jsonResponse(400, { error: 'invalid phone' });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    db: { schema: 'poxpur' },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existingConv, error: convErr } = await supabase
    .from('conversations')
    .select('id, customer_id, customer_nome_snapshot')
    .eq('customer_phone', phone)
    .eq('status', 'aberta')
    .order('ultima_mensagem_em', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (convErr) return jsonResponse(500, { error: 'db error', detail: convErr.message });

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
        customer_nome_snapshot: customer?.nome ?? payload.fromName ?? null,
        canal: 'whatsapp',
        status: 'aberta',
        assigned_to: null,
      })
      .select('id')
      .single();

    if (createErr || !newConv) {
      return jsonResponse(500, { error: 'create conv failed', detail: createErr?.message });
    }
    conversationId = newConv.id;
  }

  if (payload.whatsappMessageId) {
    const { data: existing } = await supabase
      .from('messages')
      .select('id')
      .eq('whatsapp_message_id', payload.whatsappMessageId)
      .maybeSingle();
    if (existing) {
      return jsonResponse(200, { conversationId, messageId: existing.id, deduplicated: true });
    }
  }

  const { data: msg, error: msgErr } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_type: 'cliente',
      sender_id: null,
      tipo: payload.type ?? 'texto',
      conteudo: payload.text,
      anexo_url: payload.anexoUrl ?? null,
      whatsapp_message_id: payload.whatsappMessageId ?? null,
      metadata: payload.metadata ?? { source: 'evolution-n8n' },
      lida: false,
    })
    .select('id')
    .single();

  if (msgErr || !msg) {
    return jsonResponse(500, { error: 'insert msg failed', detail: msgErr?.message });
  }

  return jsonResponse(200, { conversationId, messageId: msg.id });
});
