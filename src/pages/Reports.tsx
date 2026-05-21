import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { FileDown, TrendingUp, ShoppingCart, Percent, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportCard } from '@/components/reports/ReportCard';
import { PeriodPicker, defaultPeriod } from '@/components/reports/PeriodPicker';
import { useReports } from '@/hooks/useReports';
import { fmtBRL } from '@/lib/format';
import type { Period } from '@/components/reports/PeriodPicker';
import type { OrderStatus } from '@/types/database';

// ─── Status color map ─────────────────────────────────────────────────────────

const STATUS_COLORS: Record<OrderStatus, string> = {
  novo: '#3b82f6',
  pendente_aprovacao: '#f59e0b',
  aprovado: '#8BC53F',
  aguardando_fabrica: '#1d4ed8',
  enviado: '#a855f7',
  concluido: '#10b981',
  recusado: '#E63946',
  cancelado: '#71717a',
} as unknown as Record<OrderStatus, string>;

const POXPUR_GREEN = '#8BC53F';

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon: Icon,
  isLoading,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  isLoading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-poxpur-green/10">
          <Icon className="h-5 w-5 text-poxpur-green" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{title}</p>
          {isLoading ? (
            <Skeleton className="mt-1 h-6 w-24" />
          ) : (
            <p className="text-xl font-bold text-poxpur-navy">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Reports() {
  const [period, setPeriod] = useState<Period>(defaultPeriod);

  const { data, isLoading } = useReports({ from: period.from, to: period.to });

  const totals = data?.totals;
  const vendasPorVendedor = data?.vendasPorVendedor ?? [];
  const pedidosPorStatus = data?.pedidosPorStatus ?? [];
  const faturamentoMensal = data?.faturamentoMensal ?? [];
  const produtosMaisVendidos = data?.produtosMaisVendidos ?? [];
  const clientesTop = data?.clientesTop ?? [];
  const funilConversao = data?.funilConversao ?? [];
  const maxFunil = funilConversao.length > 0 ? (funilConversao[0]?.count ?? 1) : 1;

  return (
    <div className="flex h-full flex-col gap-6 overflow-auto p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-poxpur-navy">Relatórios</h1>
          <p className="text-sm text-muted-foreground">
            Análise de vendas e desempenho do período
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodPicker value={period} onChange={setPeriod} />
          <UITooltip>
            <TooltipTrigger asChild>
              <span>
                <Button variant="outline" size="sm" disabled className="gap-2">
                  <FileDown className="h-4 w-4" />
                  Exportar PDF
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Em breve</TooltipContent>
          </UITooltip>
          <UITooltip>
            <TooltipTrigger asChild>
              <span>
                <Button variant="outline" size="sm" disabled className="gap-2">
                  <FileDown className="h-4 w-4" />
                  Exportar Excel
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Em breve</TooltipContent>
          </UITooltip>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Total de Pedidos"
          value={String(totals?.count ?? 0)}
          icon={ShoppingCart}
          isLoading={isLoading}
        />
        <StatCard
          title="Faturamento"
          value={fmtBRL.format(totals?.faturamento ?? 0)}
          icon={DollarSign}
          isLoading={isLoading}
        />
        <StatCard
          title="Ticket Médio"
          value={fmtBRL.format(totals?.ticketMedio ?? 0)}
          icon={TrendingUp}
          isLoading={isLoading}
        />
        <StatCard
          title="Taxa Conversão"
          value={`${(totals?.taxaConversao ?? 0).toFixed(1)}%`}
          icon={Percent}
          isLoading={isLoading}
        />
      </div>

      {/* Charts grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Vendas por vendedor */}
        <ReportCard
          title="Vendas por Vendedor"
          description="Top 5 por faturamento (exclui recusado/cancelado)"
          isLoading={isLoading}
        >
          {vendasPorVendedor.length === 0 ? (
            <EmptyState message="Sem dados no período" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={vendasPorVendedor}
                layout="vertical"
                margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(v: number) => fmtBRL.format(v)}
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  type="category"
                  dataKey="nome"
                  width={80}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value) => [fmtBRL.format(Number(value)), 'Faturamento']}
                />
                <Bar dataKey="faturamento" fill={POXPUR_GREEN} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ReportCard>

        {/* Pedidos por status */}
        <ReportCard
          title="Pedidos por Status"
          description="Distribuição de pedidos no período"
          isLoading={isLoading}
        >
          {pedidosPorStatus.length === 0 ? (
            <EmptyState message="Sem dados no período" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pedidosPorStatus}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label={({ name, percent }: { name?: string; percent?: number }) =>
                    `${name ?? ''} (${((percent ?? 0) * 100).toFixed(0)}%)`
                  }
                  labelLine={false}
                >
                  {pedidosPorStatus.map((entry) => (
                    <Cell
                      key={entry.status}
                      fill={STATUS_COLORS[entry.status] ?? '#94a3b8'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [value, name]}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ReportCard>

        {/* Faturamento mensal */}
        <ReportCard
          title="Faturamento Mensal"
          description="Últimos 6 meses (excluindo recusado/cancelado)"
          isLoading={isLoading}
        >
          {faturamentoMensal.length === 0 ? (
            <EmptyState message="Sem dados" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart
                data={faturamentoMensal}
                margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`
                  }
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  formatter={(value) => [fmtBRL.format(Number(value)), 'Faturamento']}
                />
                <Line
                  type="monotone"
                  dataKey="valor"
                  stroke={POXPUR_GREEN}
                  strokeWidth={2}
                  dot={{ fill: POXPUR_GREEN, r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ReportCard>

        {/* Funil de conversão */}
        <ReportCard
          title="Funil de Conversão"
          description="Da criação à conclusão do pedido"
          isLoading={isLoading}
        >
          {funilConversao.length === 0 ? (
            <EmptyState message="Sem dados no período" />
          ) : (
            <div className="space-y-3 py-2">
              {funilConversao.map((step, idx) => {
                const pct = maxFunil > 0 ? (step.count / maxFunil) * 100 : 0;
                const opacity = 1 - idx * 0.18;
                return (
                  <div key={step.etapa} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{step.etapa}</span>
                      <span className="font-semibold tabular-nums">{step.count}</span>
                    </div>
                    <div className="h-6 w-full overflow-hidden rounded bg-muted">
                      <div
                        className="h-full rounded transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: POXPUR_GREEN,
                          opacity,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ReportCard>

        {/* Produtos mais vendidos */}
        <ReportCard
          title="Produtos Mais Vendidos"
          description="Top 10 por quantidade (exclui recusado/cancelado)"
          isLoading={isLoading}
        >
          {produtosMaisVendidos.length === 0 ? (
            <EmptyState message="Sem dados no período" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={produtosMaisVendidos}
                layout="vertical"
                margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis
                  type="category"
                  dataKey="nome"
                  width={90}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  formatter={(value) => [value, 'Qtd']}
                />
                <Bar dataKey="quantidadeTotal" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ReportCard>

        {/* Clientes top */}
        <ReportCard
          title="Top Clientes"
          description="Por faturamento no período (exclui recusado/cancelado)"
          isLoading={isLoading}
        >
          {clientesTop.length === 0 ? (
            <EmptyState message="Sem dados no período" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="pb-2 text-left font-medium text-muted-foreground">Nome</th>
                    <th className="pb-2 text-center font-medium text-muted-foreground">Pedidos</th>
                    <th className="pb-2 text-right font-medium text-muted-foreground">
                      Faturamento
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {clientesTop.map((c, i) => (
                    <tr key={c.customerId} className="border-b last:border-0">
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            #{i + 1}
                          </span>
                          <span className="font-medium">{c.nome}</span>
                        </div>
                      </td>
                      <td className="py-2 text-center text-muted-foreground">{c.pedidos}</td>
                      <td className="py-2 text-right font-semibold">
                        {fmtBRL.format(c.faturamento)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ReportCard>
      </div>
    </div>
  );
}
