import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { PoxpurCustomerInsert } from '@/types/database';

// ─── Query Keys ──────────────────────────────────────────────────────────────

const CUSTOMERS_KEY = ['customers'] as const;
const customerKey = (id: string) => ['customer', id] as const;

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useCustomers() {
  return useQuery({
    queryKey: CUSTOMERS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: customerKey(id ?? ''),
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateCustomer() {
  const qc = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (payload: Omit<PoxpurCustomerInsert, 'criado_por'>) => {
      const { data, error } = await supabase
        .from('customers')
        .insert({ ...payload, criado_por: session?.user.id ?? null })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CUSTOMERS_KEY });
      toast.success('Cliente criado');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao criar cliente: ${err.message}`);
    },
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<PoxpurCustomerInsert>;
    }) => {
      const { data, error } = await supabase
        .from('customers')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: CUSTOMERS_KEY });
      void qc.invalidateQueries({ queryKey: customerKey(id) });
      toast.success('Cliente atualizado');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao atualizar cliente: ${err.message}`);
    },
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CUSTOMERS_KEY });
      toast.success('Cliente removido');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao remover cliente: ${err.message}`);
    },
  });
}
