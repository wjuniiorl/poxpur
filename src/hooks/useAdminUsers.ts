import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { PoxpurProfile, UserRole } from '@/types/database';

// ─── Fetch All Users ──────────────────────────────────────────────────────────

export function useAdminUsers() {
  return useQuery<PoxpurProfile[]>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return data as PoxpurProfile[];
    },
  });
}

// ─── Toggle User Active ───────────────────────────────────────────────────────

export function useToggleUserAtivo() {
  const qc = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      if (id === profile?.id) {
        throw new Error('Você não pode alterar seu próprio status');
      }
      const { error } = await supabase.from('profiles').update({ ativo }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { ativo }) => {
      void qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(ativo ? 'Usuário ativado' : 'Usuário desativado');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

// ─── Change User Role ─────────────────────────────────────────────────────────

export function useChangeUserRole() {
  const qc = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: UserRole }) => {
      if (id === profile?.id) {
        throw new Error('Você não pode alterar seu próprio papel');
      }
      const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Papel atualizado');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
