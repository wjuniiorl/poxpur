import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import type { OrderWithRelations, PoxpurProfile } from '@/types/database';

// Helper: merge sellers (auth.users → profiles) client-side.
// PostgREST não joina diretamente porque orders.seller_id é FK pra auth.users.
async function mergeSellersDS<T extends { seller_id: string }>(
  rows: T[],
): Promise<(T & { seller: Pick<PoxpurProfile, 'id' | 'nome' | 'role'> | null })[]> {
  const ids = [...new Set(rows.map((r) => r.seller_id).filter(Boolean))] as string[];
  const map: Record<string, Pick<PoxpurProfile, 'id' | 'nome' | 'role'>> = {};
  if (ids.length > 0) {
    const { data } = await supabase.from('profiles').select('id, nome, role').in('id', ids);
    for (const p of data ?? []) {
      map[p.id] = p as Pick<PoxpurProfile, 'id' | 'nome' | 'role'>;
    }
  }
  return rows.map((r) => ({ ...r, seller: map[r.seller_id] ?? null }));
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type DashboardStats = {
  pedidosHoje: number;
  faturamentoMes: number;
  ticketMedio: number;
  taxaConversao: number;
};

export type SellerRankingEntry = {
  seller: { id: string; nome: string };
  orders_count: number;
  revenue: number;
  progress: number;
};

export type DashboardData = {
  isLoading: boolean;
  stats: DashboardStats;
  recentOrders: OrderWithRelations[];
  ranking: SellerRankingEntry[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfDay(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfMonth(): string {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDashboardStats(): DashboardData {
  const { session } = useAuth();
  const isAdmin = useIsAdmin();
  const userId = session?.user.id;

  // ── Today's order count ───────────────────────────────────────────────────
  const todayQuery = useQuery({
    queryKey: ['dashboard', 'pedidos-hoje'],
    enabled: !!userId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .gte('criado_em', startOfDay());
      if (error) throw error;
      return count ?? 0;
    },
  });

  // ── This month's orders (for faturamento, ticket médio, taxa, ranking) ───
  const monthOrdersQuery = useQuery({
    queryKey: ['dashboard', 'orders-mes'],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(
          `*,
          customer:customers!orders_customer_id_fkey(id, nome, telefone, email)`,
        )
        .gte('criado_em', startOfMonth())
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return await mergeSellersDS(
        (data as unknown as (OrderWithRelations & { seller_id: string })[]) ?? [],
      );
    },
  });

  // ── Recent orders (last 5 overall) ────────────────────────────────────────
  const recentOrdersQuery = useQuery({
    queryKey: ['dashboard', 'recent-orders'],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(
          `*,
          customer:customers!orders_customer_id_fkey(id, nome, telefone, email)`,
        )
        .order('criado_em', { ascending: false })
        .limit(5);
      if (error) throw error;
      return await mergeSellersDS(
        (data as unknown as (OrderWithRelations & { seller_id: string })[]) ?? [],
      );
    },
  });

  // ── Compute aggregates from month orders ──────────────────────────────────
  const monthOrders = monthOrdersQuery.data ?? [];

  const nonCancelledOrders = monthOrders.filter(
    (o) => o.status !== 'recusado' && o.status !== 'cancelado',
  );

  const faturamentoMes = nonCancelledOrders.reduce((sum, o) => sum + (o.valor_total ?? 0), 0);
  const ticketMedio =
    nonCancelledOrders.length > 0 ? faturamentoMes / nonCancelledOrders.length : 0;

  const aprovados = monthOrders.filter((o) => o.status === 'aprovado').length;
  const recusados = monthOrders.filter((o) => o.status === 'recusado').length;
  const taxaConversao =
    aprovados + recusados > 0 ? (aprovados / (aprovados + recusados)) * 100 : 0;

  // ── Build seller ranking (admin only) ─────────────────────────────────────
  let ranking: SellerRankingEntry[] = [];

  if (isAdmin && monthOrders.length > 0) {
    const sellerMap = new Map<string, { nome: string; orders_count: number; revenue: number }>();

    for (const order of nonCancelledOrders) {
      if (!order.seller) continue;
      const sid = order.seller.id;
      const entry = sellerMap.get(sid) ?? {
        nome: order.seller.nome,
        orders_count: 0,
        revenue: 0,
      };
      entry.orders_count += 1;
      entry.revenue += order.valor_total ?? 0;
      sellerMap.set(sid, entry);
    }

    const sorted = [...sellerMap.entries()]
      .map(([id, e]) => ({ id, ...e }))
      .sort((a, b) => b.revenue - a.revenue);

    const maxRevenue = sorted[0]?.revenue ?? 1;

    ranking = sorted.map((e) => ({
      seller: { id: e.id, nome: e.nome },
      orders_count: e.orders_count,
      revenue: e.revenue,
      progress: Math.round((e.revenue / maxRevenue) * 100),
    }));
  }

  const isLoading =
    todayQuery.isLoading || monthOrdersQuery.isLoading || recentOrdersQuery.isLoading;

  return {
    isLoading,
    stats: {
      pedidosHoje: todayQuery.data ?? 0,
      faturamentoMes,
      ticketMedio,
      taxaConversao,
    },
    recentOrders: recentOrdersQuery.data ?? [],
    ranking,
  };
}
