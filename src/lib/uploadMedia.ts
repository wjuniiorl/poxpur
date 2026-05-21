import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

// Storage requer client com schema public (storage não está em poxpur)
const storageClient = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

export async function uploadMedia(
  file: File,
  prefix = 'chat',
): Promise<{ url: string; path: string; mime: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('not authenticated');

  const ext = file.name.split('.').pop() || 'bin';
  const path = `${prefix}/${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await storageClient.storage.from('whatsapp-media').upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  const { data } = storageClient.storage.from('whatsapp-media').getPublicUrl(path);
  return { url: data.publicUrl, path, mime: file.type };
}
