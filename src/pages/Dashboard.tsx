import { useNavigate } from 'react-router-dom';
import {
  Trophy,
  Package,
  MessageSquarePlus,
  ShoppingCart,
  Building2,
  CheckSquare,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { fmtBRL, fmtRelativeBR } from '@/lib/format';
import { ORDER_STATUS_LABELS } from '@/types/database';
import type { OrderWithRelations } from '@/types/database';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function dateBR() {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}

// ─── Recent orders list ───────────────────────────────────────────────────────

function RecentOrders({
  orders,
  isLoading,
}: {
  orders: OrderWithRelations[];
  isLoading: boolean;
}) {
  const navigate = useNavigate();

  return (
    <Card className="flex h-full flex-col p-5 shadow-soft">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-poxpur-navy">Pedidos recentes</h2>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto">
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <div className="space-y-1 text-right">
                  <Skeleton className="h-3.5 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            ))}
          </>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <Package className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Nenhum pedido criado ainda</p>
            <Button variant="outline" size="sm" onClick={() => navigate('/orders')}>
              Ir para Pedidos
            </Button>
          </div>
        ) : (
          orders.map((order) => {
            const statusInfo = ORDER_STATUS_LABELS[order.status];
            const sellerName = order.seller?.nome ?? '—';
            const initials = sellerName
              .split(' ')
              .slice(0, 2)
              .map((s) => s[0]?.toUpperCase() ?? '')
              .join('');

            return (
              <div
                key={order.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-secondary"
                onClick={() => navigate('/orders')}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-poxpur-navy text-xs font-medium text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 text-sm">
                    <span className="font-medium text-poxpur-navy">#{order.numero}</span>
                    <span className="truncate text-foreground">
                      {order.customer?.nome ?? '—'}
                    </span>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {sellerName} · {fmtRelativeBR(order.criado_em)}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-semibold text-poxpur-navy">
                    {fmtBRL.format(order.valor_total)}
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn('mt-0.5 text-[10px]', statusInfo?.color)}
                  >
                    {statusInfo?.label ?? order.status}
                  </Badge>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}

// ─── Seller ranking ───────────────────────────────────────────────────────────

const medals = ['🥇', '🥈', '🥉'];

function SellerRanking({
  ranking,
  isLoading,
}: {
  ranking: ReturnType<typeof useDashboardStats>['ranking'];
  isLoading: boolean;
}) {
  return (
    <Card className="h-full p-5 shadow-soft">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold text-poxpur-navy">
          <Trophy className="h-4 w-4 text-poxpur-green" />
          Ranking de vendedores
        </h2>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          este mês
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-7 w-7 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      ) : ranking.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum pedido registrado este mês.
        </p>
      ) : (
        <div className="space-y-3">
          {ranking.map((r, idx) => {
            const initials = r.seller.nome
              .split(' ')
              .slice(0, 2)
              .map((s) => s[0]?.toUpperCase() ?? '')
              .join('');
            return (
              <div key={r.seller.id} className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <span className="text-base">{medals[idx] ?? `#${idx + 1}`}</span>
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-poxpur-navy text-xs text-white">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-poxpur-navy">
                      {r.seller.nome}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {r.orders_count} {r.orders_count === 1 ? 'pedido' : 'pedidos'} ·{' '}
                      {fmtBRL.format(r.revenue)}
                    </div>
                  </div>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-poxpur-green transition-all"
                    style={{ width: `${r.progress}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = useIsAdmin();
  const firstName = profile?.nome.split(' ')[0] ?? '';

  // TODO Onda 5: add delta % vs previous period to stats
  const { isLoading, stats, recentOrders, ranking } = useDashboardStats();

  const statCards = [
    {
      label: 'Pedidos hoje',
      value: String(stats.pedidosHoje),
    },
    {
      label: 'Faturamento do mês',
      value: fmtBRL.format(stats.faturamentoMes),
    },
    {
      label: 'Ticket médio',
      value: stats.ticketMedio > 0 ? fmtBRL.format(stats.ticketMedio) : '—',
    },
    {
      label: 'Taxa de conversão',
      value: stats.taxaConversao > 0 ? `${stats.taxaConversao.toFixed(0)}%` : '—',
    },
  ];

  return (
    <div className="flex h-full flex-col gap-6">
      {/* Saudação */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-poxpur-navy">
            {greeting()}, {firstName} 👋
          </h1>
          <p className="text-sm text-muted-foreground">Visão geral do seu desempenho</p>
        </div>
        <div className="text-sm text-muted-foreground">Hoje: {dateBR()}</div>
      </div>

      {/* StatsCards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <StatsCard key={s.label} stat={s} isLoading={isLoading} />
        ))}
      </div>

      {/* Grid principal */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex min-h-0 flex-col gap-4 lg:col-span-2">
          <RecentOrders orders={recentOrders} isLoading={isLoading} />
          <Card className="p-5 shadow-soft">
            <h3 className="mb-3 text-base font-semibold text-poxpur-navy">Atalhos rápidos</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/chat?new=1')}
                className="h-auto flex-col gap-1.5 py-3"
              >
                <MessageSquarePlus className="h-5 w-5 text-poxpur-green" />
                <span className="text-xs">Nova conversa</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/orders?new=1')}
                className="h-auto flex-col gap-1.5 py-3"
              >
                <ShoppingCart className="h-5 w-5 text-poxpur-green" />
                <span className="text-xs">Novo pedido</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/customers?new=1')}
                className="h-auto flex-col gap-1.5 py-3"
              >
                <Building2 className="h-5 w-5 text-poxpur-green" />
                <span className="text-xs">Novo cliente</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/tasks?new=1')}
                className="h-auto flex-col gap-1.5 py-3"
              >
                <CheckSquare className="h-5 w-5 text-poxpur-green" />
                <span className="text-xs">Nova tarefa</span>
              </Button>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Dica: aperte <kbd className="rounded border bg-secondary px-1.5 py-0.5 text-[10px] font-mono">Ctrl+K</kbd> em qualquer página pra busca rápida.
            </p>
          </Card>
        </div>

        <div className="flex min-h-0 flex-col gap-4">
          {isAdmin && <SellerRanking ranking={ranking} isLoading={isLoading} />}
          {!isAdmin && (
            <Card className="p-5 shadow-soft">
              <h3 className="mb-2 text-base font-semibold text-poxpur-navy">Seu desempenho</h3>
              <p className="text-sm text-muted-foreground">
                Métricas pessoais de pedidos aparecem aqui.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
