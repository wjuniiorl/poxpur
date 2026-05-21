import { useQuery } from '@tanstack/react-query';
import {
  startOfMonth,
  subMonths,
  format,
} from 'date-fns';
import { supabase } from '@/lib/supabase';
import type { OrderStatus } from '@/types/database';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReportTotals = {
  count: number;
  faturamento: number;
  ticketMedio: number;
  taxaConversao: number;
};

export type VendaPorVendedor = {
  sellerId: string;
  nome: string;
  faturamento: number;
  pedidos: number;
};

export type PedidoPorStatus = {
  status: OrderStatus;
  label: string;
  count: number;
  valor: number;
};

export type FaturamentoMensal = {
  mes: string; // e.g. "Jan/25"
  valor: number;
};

export type ProdutoMaisVendido = {
  productId: string;
  nome: string;
  sku: string;
  quantidadeTotal: number;
  valorTotal: number;
};

export type ClienteTop = {
  customerId: string;
  nome: string;
  pedidos: number;
  faturamento: number;
};

export type FunilConversao = {
  etapa: string;
  count: number;
};

export type ReportData = {
  totals: ReportTotals;
  vendasPorVendedor: VendaPorVendedor[];
  pedidosPorStatus: PedidoPorStatus[];
  faturamentoMensal: FaturamentoMensal[];
  produtosMaisVendidos: ProdutoMaisVendido[];
  clientesTop: ClienteTop[];
  funilConversao: FunilConversao[];
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  pendente_aprovacao: 'Pendente aprovação',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
  aguardando_fabrica: 'Aguardando fábrica',
  enviado: 'Enviado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useReports({ from, to }: { from: Date; to: Date }) {
  return useQuery<ReportData>({
    queryKey: ['reports', from.toISOString(), to.toISOString()],
    staleTime: 60_000,
    queryFn: async () => {
      // ── Fetch orders in period ──────────────────────────────────────────────
      const { data: ordersRaw, error: ordersError } = await supabase
        .from('orders')
        .select(
          `*, customer:customers!orders_customer_id_fkey(id, nome), items:order_items(quantidade, valor_total, product:products!order_items_product_id_fkey(id, nome, sku))`,
        )
        .gte('criado_em', from.toISOString())
        .lte('criado_em', to.toISOString())
        .order('criado_em', { ascending: false });

      if (ordersError) throw ordersError;

      // ── Fetch seller profiles ───────────────────────────────────────────────
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, nome, role');
      if (profilesError) throw profilesError;

      const profileMap = new Map<string, string>(
        (profiles ?? []).map((p) => [p.id, p.nome]),
      );

      type OrderRaw = typeof ordersRaw extends (infer T)[] | null ? T : never;
      const orders: OrderRaw[] = ordersRaw ?? [];

      // ── Last 6 months data (independent of period) ──────────────────────────
      const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));
      const { data: monthlyRaw, error: monthlyError } = await supabase
        .from('orders')
        .select('criado_em, valor_total, status')
        .gte('criado_em', sixMonthsAgo.toISOString());
      if (monthlyError) throw monthlyError;

      // ── Aggregations ───────────────────────────────────────────────────────

      // totals
      const excluded: OrderStatus[] = ['recusado', 'cancelado'];
      const active = orders.filter((o) => !excluded.includes(o.status as OrderStatus));
      const approved: OrderStatus[] = ['aprovado', 'enviado', 'concluido'];
      const approvedOrders = orders.filter((o) => approved.includes(o.status as OrderStatus));
      const negativeOrders = orders.filter((o) => (o.status as OrderStatus) === 'recusado');

      const totalFaturamento = active.reduce((s, o) => s + (o.valor_total ?? 0), 0);
      const taxaConversao =
        approvedOrders.length + negativeOrders.length > 0
          ? (approvedOrders.length / (approvedOrders.length + negativeOrders.length)) * 100
          : 0;

      const totals: ReportTotals = {
        count: orders.length,
        faturamento: totalFaturamento,
        ticketMedio: active.length > 0 ? totalFaturamento / active.length : 0,
        taxaConversao,
      };

      // vendasPorVendedor (top 5, exclude recusado/cancelado)
      const sellerMap = new Map<string, { faturamento: number; pedidos: number }>();
      for (const o of active) {
        const sid = o.seller_id as string;
        const entry = sellerMap.get(sid) ?? { faturamento: 0, pedidos: 0 };
        entry.faturamento += o.valor_total ?? 0;
        entry.pedidos += 1;
        sellerMap.set(sid, entry);
      }
      const vendasPorVendedor: VendaPorVendedor[] = Array.from(sellerMap.entries())
        .map(([sellerId, v]) => ({
          sellerId,
          nome: profileMap.get(sellerId) ?? 'Desconhecido',
          faturamento: v.faturamento,
          pedidos: v.pedidos,
        }))
        .sort((a, b) => b.faturamento - a.faturamento)
        .slice(0, 5);

      // pedidosPorStatus
      const statusMap = new Map<OrderStatus, { count: number; valor: number }>();
      for (const o of orders) {
        const s = o.status as OrderStatus;
        const entry = statusMap.get(s) ?? { count: 0, valor: 0 };
        entry.count += 1;
        entry.valor += o.valor_total ?? 0;
        statusMap.set(s, entry);
      }
      const pedidosPorStatus: PedidoPorStatus[] = Array.from(statusMap.entries()).map(
        ([status, v]) => ({
          status,
          label: STATUS_LABELS[status] ?? status,
          count: v.count,
          valor: v.valor,
        }),
      );

      // faturamentoMensal — last 6 calendar months
      const buckets: Map<string, number> = new Map();
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        const key = format(d, 'MMM/yy');
        buckets.set(key, 0);
      }
      for (const o of monthlyRaw ?? []) {
        if ((o.status as OrderStatus) === 'recusado' || (o.status as OrderStatus) === 'cancelado') continue;
        const key = format(new Date(o.criado_em), 'MMM/yy');
        if (buckets.has(key)) {
          buckets.set(key, (buckets.get(key) ?? 0) + (o.valor_total ?? 0));
        }
      }
      const faturamentoMensal: FaturamentoMensal[] = Array.from(buckets.entries()).map(
        ([mes, valor]) => ({ mes, valor }),
      );

      // produtosMaisVendidos (top 10 by quantidade)
      const productQtyMap = new Map<
        string,
        { nome: string; sku: string; quantidadeTotal: number; valorTotal: number }
      >();
      for (const o of active) {
        const items = (o as unknown as { items?: { quantidade: number; valor_total: number; product: { id: string; nome: string; sku: string } | null }[] }).items ?? [];
        for (const item of items) {
          if (!item.product) continue;
          const pid = item.product.id;
          const entry = productQtyMap.get(pid) ?? {
            nome: item.product.nome,
            sku: item.product.sku,
            quantidadeTotal: 0,
            valorTotal: 0,
          };
          entry.quantidadeTotal += item.quantidade;
          entry.valorTotal += item.valor_total;
          productQtyMap.set(pid, entry);
        }
      }
      const produtosMaisVendidos: ProdutoMaisVendido[] = Array.from(productQtyMap.entries())
        .map(([productId, v]) => ({ productId, ...v }))
        .sort((a, b) => b.quantidadeTotal - a.quantidadeTotal)
        .slice(0, 10);

      // clientesTop (top 10 by faturamento, exclude recusado/cancelado)
      const customerMap = new Map<string, { nome: string; pedidos: number; faturamento: number }>();
      for (const o of active) {
        const cust = (o as unknown as { customer?: { id: string; nome: string } | null }).customer;
        if (!cust) continue;
        const entry = customerMap.get(cust.id) ?? { nome: cust.nome, pedidos: 0, faturamento: 0 };
        entry.pedidos += 1;
        entry.faturamento += o.valor_total ?? 0;
        customerMap.set(cust.id, entry);
      }
      const clientesTop: ClienteTop[] = Array.from(customerMap.entries())
        .map(([customerId, v]) => ({ customerId, ...v }))
        .sort((a, b) => b.faturamento - a.faturamento)
        .slice(0, 10);

      // funilConversao
      const totalCount = orders.length;
      const aprovadosCount = orders.filter((o) =>
        (['aprovado', 'enviado', 'concluido', 'aguardando_fabrica'] as OrderStatus[]).includes(
          o.status as OrderStatus,
        ),
      ).length;
      const enviadosCount = orders.filter((o) =>
        (['enviado', 'concluido'] as OrderStatus[]).includes(o.status as OrderStatus),
      ).length;
      const concluidosCount = orders.filter(
        (o) => (o.status as OrderStatus) === 'concluido',
      ).length;

      const funilConversao: FunilConversao[] = [
        { etapa: 'Criados', count: totalCount },
        { etapa: 'Aprovados', count: aprovadosCount },
        { etapa: 'Enviados', count: enviadosCount },
        { etapa: 'Concluídos', count: concluidosCount },
      ];

      return {
        totals,
        vendasPorVendedor,
        pedidosPorStatus,
        faturamentoMensal,
        produtosMaisVendidos,
        clientesTop,
        funilConversao,
      };
    },
  });
}
