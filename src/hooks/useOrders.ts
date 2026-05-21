import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { OrderStatus, OrderWithRelations } from '@/types/database';

// ─── Types ────────────────────────────────────────────────────────────────────

export type OrderFilters = {
  status?: OrderStatus | OrderStatus[];
  sellerId?: string;
  customerId?: string;
  search?: string;
  periodDays?: number;
};

export type CreateOrderPayload = {
  customer_id: string;
  forma_pagamento?: 'pix' | 'boleto' | 'cartao' | 'transferencia' | 'a_combinar' | null;
  prazo_entrega?: string | null;
  observacoes?: string | null;
  valor_desconto?: number;
  valor_frete?: number;
  items: {
    product_id: string;
    quantidade: number;
    valor_unitario: number;
  }[];
};

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const ordersKey = (filters?: OrderFilters) => ['orders', filters ?? {}] as const;
export const orderKey = (id: string) => ['order', id] as const;

// ─── List Query ───────────────────────────────────────────────────────────────

export function useOrders(filters?: OrderFilters) {
  return useQuery({
    queryKey: ordersKey(filters),
    queryFn: async () => {
      let q = supabase
        .from('orders')
        .select(
          `*,
          customer:customers!orders_customer_id_fkey(id, nome, telefone, email),
          seller:profiles!orders_seller_id_fkey(id, nome, role)`,
        )
        .order('criado_em', { ascending: false });

      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          if (filters.status.length > 0) {
            q = q.in('status', filters.status);
          }
        } else {
          q = q.eq('status', filters.status);
        }
      }

      if (filters?.sellerId) {
        q = q.eq('seller_id', filters.sellerId);
      }

      if (filters?.customerId) {
        q = q.eq('customer_id', filters.customerId);
      }

      if (filters?.periodDays) {
        const since = new Date();
        since.setDate(since.getDate() - filters.periodDays);
        q = q.gte('criado_em', since.toISOString());
      }

      const { data, error } = await q;
      if (error) throw error;

      const typed = data as unknown as OrderWithRelations[];

      // Client-side search filter (by numero or customer name)
      if (filters?.search) {
        const term = filters.search.toLowerCase();
        return typed.filter((o) => {
          const matchesNumero = String(o.numero).includes(term);
          const matchesCustomer = o.customer?.nome.toLowerCase().includes(term) ?? false;
          return matchesNumero || matchesCustomer;
        });
      }

      return typed;
    },
  });
}

// ─── Single Order Query ───────────────────────────────────────────────────────

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: orderKey(id ?? ''),
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(
          `*,
          customer:customers!orders_customer_id_fkey(id, nome, telefone, email),
          seller:profiles!orders_seller_id_fkey(id, nome, role),
          items:order_items(*, product:products!order_items_product_id_fkey(id, nome, sku))`,
        )
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as OrderWithRelations | null;
    },
  });
}

// ─── Create Order ─────────────────────────────────────────────────────────────

export function useCreateOrder() {
  const qc = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (payload: CreateOrderPayload) => {
      const sellerId = session?.user.id;
      if (!sellerId) throw new Error('Não autenticado');

      // 1. Insert order row
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: payload.customer_id,
          seller_id: sellerId,
          status: 'pendente_aprovacao',
          forma_pagamento: payload.forma_pagamento ?? null,
          prazo_entrega: payload.prazo_entrega ?? null,
          observacoes: payload.observacoes ?? null,
          valor_desconto: payload.valor_desconto ?? 0,
          valor_frete: payload.valor_frete ?? 0,
        })
        .select()
        .single();
      if (orderError) throw orderError;

      // 2. Insert all order_items
      const { error: itemsError } = await supabase.from('order_items').insert(
        payload.items.map((item) => ({
          order_id: orderData.id,
          product_id: item.product_id,
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
        })),
      );
      if (itemsError) throw itemsError;

      // 3. Refetch order to get computed totals
      const { data: refreshed, error: refreshError } = await supabase
        .from('orders')
        .select(
          `*,
          customer:customers!orders_customer_id_fkey(id, nome, telefone, email),
          seller:profiles!orders_seller_id_fkey(id, nome, role),
          items:order_items(*, product:products!order_items_product_id_fkey(id, nome, sku))`,
        )
        .eq('id', orderData.id)
        .maybeSingle();
      if (refreshError) throw refreshError;

      return refreshed as unknown as OrderWithRelations;
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['orders'] });
      if (data?.id) {
        void qc.invalidateQueries({ queryKey: orderKey(data.id) });
      }
      toast.success(`Pedido #${data?.numero ?? ''} criado, aguardando aprovação`);
    },
    onError: (err: Error) => {
      toast.error(`Erro ao criar pedido: ${err.message}`);
    },
  });
}

// ─── Approve Order ────────────────────────────────────────────────────────────

export function useApproveOrder() {
  const qc = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      // Check stock for all items
      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('product_id, quantidade')
        .eq('order_id', id);
      if (itemsError) throw itemsError;

      // Aggregate quantities per product
      const productQty: Record<string, number> = {};
      for (const item of items ?? []) {
        productQty[item.product_id] = (productQty[item.product_id] ?? 0) + item.quantidade;
      }

      const productIds = Object.keys(productQty);
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, estoque')
        .in('id', productIds);
      if (productsError) throw productsError;

      const hasSufficientStock = (products ?? []).every(
        (p) => p.estoque >= (productQty[p.id] ?? 0),
      );

      const newStatus = hasSufficientStock ? 'aprovado' : 'aguardando_fabrica';

      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          aprovado_por: session?.user.id ?? null,
          aprovado_em: new Date().toISOString(),
        })
        .eq('id', id);
      if (updateError) throw updateError;

      return { newStatus, hasSufficientStock };
    },
    onSuccess: ({ newStatus, hasSufficientStock }, { id }) => {
      void qc.invalidateQueries({ queryKey: ['orders'] });
      void qc.invalidateQueries({ queryKey: orderKey(id) });
      if (hasSufficientStock) {
        toast.success('Pedido aprovado — estoque suficiente');
      } else {
        toast.info(
          `Pedido aprovado, mas estoque insuficiente — status: ${newStatus === 'aguardando_fabrica' ? 'Aguardando fábrica' : newStatus}`,
        );
      }
    },
    onError: (err: Error) => {
      toast.error(`Erro ao aprovar pedido: ${err.message}`);
    },
  });
}

// ─── Reject Order ─────────────────────────────────────────────────────────────

export function useRejectOrder() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'recusado', motivo_recusa: motivo })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { id }) => {
      void qc.invalidateQueries({ queryKey: ['orders'] });
      void qc.invalidateQueries({ queryKey: orderKey(id) });
      toast.success('Pedido recusado');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao recusar pedido: ${err.message}`);
    },
  });
}

// ─── Advance Order ────────────────────────────────────────────────────────────

export function useAdvanceOrder() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      newStatus,
    }: {
      id: string;
      newStatus: 'enviado' | 'concluido' | 'cancelado';
    }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { id, newStatus }) => {
      void qc.invalidateQueries({ queryKey: ['orders'] });
      void qc.invalidateQueries({ queryKey: orderKey(id) });
      const labels: Record<string, string> = {
        enviado: 'Pedido marcado como enviado',
        concluido: 'Pedido concluído',
        cancelado: 'Pedido cancelado',
      };
      toast.success(labels[newStatus] ?? 'Status atualizado');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao atualizar pedido: ${err.message}`);
    },
  });
}

// ─── Delete Order ─────────────────────────────────────────────────────────────

export function useDeleteOrder() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase.from('orders').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Pedido excluído');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao excluir pedido: ${err.message}`);
    },
  });
}

// ─── Sellers list (for admin filter) ─────────────────────────────────────────

export function useSellers() {
  return useQuery({
    queryKey: ['sellers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, role')
        .eq('role', 'vendedor')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return data;
    },
  });
}
