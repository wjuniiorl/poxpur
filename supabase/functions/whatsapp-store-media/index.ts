import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Recebe base64 da mídia inbound (do n8n após Evolution descriptografar) e armazena
// no bucket whatsapp-media/inbound/<phone>/<msgId>.<ext>. Retorna URL pública.
// Auth: header Authorization Bearer <service_role>. Aceita tanto o JWT legacy
// quanto a key nova sb_secret_*. Validacao via tentativa de operacao privilegiada
// (listBuckets), que so service_role consegue executar.

function sanitize(s: string, fallback: string): string {
  const cleaned = s.replace(/[^a-zA-Z0-9._-]/g, '_');
  return cleaned || fallback;
}

function extFromMime(mime: string): string {
  const t = (mime || '').split(';')[0].trim().toLowerCase();
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'audio/ogg': 'ogg',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/wav': 'wav',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/3gpp': '3gp',
    'application/pdf': 'pdf',
  };
  if (map[t]) return map[t];
  const fromSlash = t.split('/').pop();
  return fromSlash ? fromSlash.replace(/[^a-z0-9]/g, '').slice(0, 6) || 'bin' : 'bin';
}

function decodeBase64(s: string): Uint8Array {
  const cleaned = s.replace(/^data:[^;]+;base64,/, '');
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const provided = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!provided) {
    return new Response(JSON.stringify({ error: 'Unauthorized: missing token' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  if (!supabaseUrl) {
    return new Response(JSON.stringify({ error: 'SUPABASE_URL ausente no edge runtime' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  // Tenta criar client com o token recebido e fazer operacao que exige service_role
  // (listBuckets). Se passar, o token e service_role valido (legacy JWT ou sb_secret_*).
  const authClient = createClient(supabaseUrl, provided);
  const { error: authErr } = await authClient.storage.listBuckets();
  if (authErr) {
    return new Response(JSON.stringify({ error: 'Unauthorized: invalid service_role' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  let body: {
    base64?: string;
    mime?: string;
    ext?: string;
    phone?: string;
    whatsappMessageId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const { base64, mime, phone, whatsappMessageId } = body;
  if (!base64) {
    return new Response(JSON.stringify({ error: 'base64 obrigatorio' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }
  if (!phone) {
    return new Response(JSON.stringify({ error: 'phone obrigatorio' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  // Para o upload em si, usa o token recebido (ja validado como service_role)
  const cleanPhone = sanitize(phone, 'unknown');
  const cleanMsgId = sanitize(
    whatsappMessageId || `gen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    'msg',
  );
  const ext =
    (body.ext || extFromMime(mime || '')).replace(/[^a-z0-9]/gi, '').slice(0, 6) || 'bin';
  const path = `inbound/${cleanPhone}/${cleanMsgId}.${ext}`;

  let bytes: Uint8Array;
  try {
    bytes = decodeBase64(base64);
  } catch (err) {
    return new Response(JSON.stringify({ error: `base64 invalido: ${String(err)}` }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const { error: uploadErr } = await authClient.storage
    .from('whatsapp-media')
    .upload(path, bytes, {
      contentType: mime || 'application/octet-stream',
      upsert: true,
    });

  if (uploadErr) {
    return new Response(JSON.stringify({ error: `upload falhou: ${uploadErr.message}` }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  const { data: pub } = authClient.storage.from('whatsapp-media').getPublicUrl(path);

  return new Response(
    JSON.stringify({ url: pub.publicUrl, path, mime: mime || 'application/octet-stream' }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
});
