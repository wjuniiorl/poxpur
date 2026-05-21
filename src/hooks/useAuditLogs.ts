import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { PoxpurAuditLog } from '@/types/database';

// ─── Filters ──────────────────────────────────────────────────────────────────

export type AuditLogFilters = {
  acao?: string;
  userId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuditLogs(filters?: AuditLogFilters) {
  const limit = filters?.limit ?? 200;

  return useQuery<PoxpurAuditLog[]>({
    queryKey: ['audit-logs', filters ?? {}],
    queryFn: async () => {
      let q = supabase
        .from('audit_logs')
        .select('*')
        .order('criado_em', { ascending: false })
        .limit(limit);

      if (filters?.acao) {
        q = q.ilike('acao', `%${filters.acao}%`);
      }
      if (filters?.userId) {
        q = q.eq('user_id', filters.userId);
      }
      if (filters?.from) {
        q = q.gte('criado_em', filters.from.toISOString());
      }
      if (filters?.to) {
        q = q.lte('criado_em', filters.to.toISOString());
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as PoxpurAuditLog[];
    },
  });
}
