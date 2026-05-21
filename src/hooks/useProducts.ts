import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { PoxpurProductInsert } from '@/types/database';

// ─── Query Keys ──────────────────────────────────────────────────────────────

const productsKey = (includeInactive: boolean) =>
  ['products', { includeInactive }] as const;
const productKey = (id: string) => ['product', id] as const;

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useProducts(includeInactive = false) {
  return useQuery({
    queryKey: productsKey(includeInactive),
    queryFn: async () => {
      let q = supabase.from('products').select('*').order('nome');
      if (!includeInactive) {
        q = q.eq('ativo', true);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: productKey(id ?? ''),
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateProduct() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: PoxpurProductInsert) => {
      const { data, error } = await supabase
        .from('products')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto criado');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao criar produto: ${err.message}`);
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<PoxpurProductInsert>;
    }) => {
      const { data, error } = await supabase
        .from('products')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: ['products'] });
      void qc.invalidateQueries({ queryKey: productKey(id) });
      toast.success('Produto atualizado');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao atualizar produto: ${err.message}`);
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();

  return useMutation({
    // Soft delete: set ativo = false to preserve order_items FK
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .update({ ativo: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto desativado');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao desativar produto: ${err.message}`);
    },
  });
}
