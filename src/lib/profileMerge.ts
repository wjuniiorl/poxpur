import { supabase } from '@/lib/supabase';
import type { PoxpurProfile } from '@/types/database';

// orders.seller_id e conversations.assigned_to são FKs pra auth.users, não poxpur.profiles.
// PostgREST não consegue embedar — fetch separado + merge client-side.

type ProfileSlice = Pick<PoxpurProfile, 'id' | 'nome' | 'role'>;

async function fetchProfilesByIds(ids: string[]): Promise<Record<string, ProfileSlice>> {
  if (ids.length === 0) return {};
  const { data } = await supabase.from('profiles').select('id, nome, role').in('id', ids);
  const map: Record<string, ProfileSlice> = {};
  for (const p of data ?? []) {
    map[p.id] = p as ProfileSlice;
  }
  return map;
}

export async function mergeSellers<T extends { seller_id: string; seller?: unknown }>(
  rows: T[],
): Promise<(T & { seller: ProfileSlice | null })[]> {
  const ids = [...new Set(rows.map((r) => r.seller_id).filter(Boolean))] as string[];
  const map = await fetchProfilesByIds(ids);
  return rows.map((r) => ({ ...r, seller: map[r.seller_id] ?? null }));
}

export async function mergeAssignees<
  T extends { assigned_to: string | null; assignee?: unknown },
>(rows: T[]): Promise<(T & { assignee: ProfileSlice | null })[]> {
  const ids = [...new Set(rows.map((r) => r.assigned_to).filter(Boolean))] as string[];
  const map = await fetchProfilesByIds(ids);
  return rows.map((r) => ({
    ...r,
    assignee: r.assigned_to ? (map[r.assigned_to] ?? null) : null,
  }));
}
