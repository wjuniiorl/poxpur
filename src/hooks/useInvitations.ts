import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { PoxpurUserInvitation } from '@/types/database';

// ─── Query Key ────────────────────────────────────────────────────────────────

const invitationsKey = ['user_invitations'] as const;

// ─── List pending invitations ─────────────────────────────────────────────────

export function useInvitations() {
  return useQuery({
    queryKey: invitationsKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('status', 'pendente')
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return data as PoxpurUserInvitation[];
    },
  });
}

// ─── Cancel invitation ────────────────────────────────────────────────────────

export function useCancelInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('user_invitations')
        .update({ status: 'cancelado' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: invitationsKey });
      toast.success('Convite cancelado');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao cancelar convite: ${err.message}`);
    },
  });
}

// ─── Delete invitation ────────────────────────────────────────────────────────

export function useDeleteInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('user_invitations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: invitationsKey });
      toast.success('Convite removido');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao remover convite: ${err.message}`);
    },
  });
}
