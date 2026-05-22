import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  MoreHorizontal,
  Inbox,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useOrders, useSellers, useAdvanceOrder } from '@/hooks/useOrders';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { fmtBRL, fmtRelativeBR, fmtDateTime } from '@/lib/format';
import { ORDER_STATUS_LABELS } from '@/types/database';
import type { OrderStatus, OrderWithRelations } from '@/types/database';
import { NewOrderModal } from '@/components/orders/NewOrderModal';
import { OrderDetailSheet } from '@/components/orders/OrderDetailSheet';

// ─── Constants ────────────────────────────────────────────────────────────────

type ViewMode = 'tabela' | 'kanban';

type PeriodOption = { label: string; days: number | null };

const PERIOD_OPTIONS: PeriodOption[] = [
  { label: 'Todos', days: null },
  { label: 'Últimos 7 dias', days: 7 },
  { label: 'Últimos 30 dias', days: 30 },
  { label: 'Últimos 90 dias', days: 90 },
];

const KANBAN_STATUSES: OrderStatus[] = [
  'pendente_aprovacao',
  'aprovado',
  'aguardando_fabrica',
  'enviado',
  'concluido',
];

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: OrderStatus }) {
  const { label, color } = ORDER_STATUS_LABELS[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}
    >
      {label}
    </span>
  );
}

// ─── Skeleton Table ───────────────────────────────────────────────────────────

function SkeletonTable() {
  return (
    <tbody>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b">
          {Array.from({ length: 7 }).map((__, j) => (
            <td key={j} className="px-4 py-3">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

// ─── Skeleton Kanban ──────────────────────────────────────────────────────────

function SkeletonKanban() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {KANBAN_STATUSES.map((status) => (
        <div key={status} className="flex w-64 shrink-0 flex-col gap-2">
          <Skeleton className="h-8 w-full rounded-md" />
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-md" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onNewOrder }: { onNewOrder: () => void }) {
  return (
    <div className="grid h-full min-h-64 place-items-center">
      <div className="max-w-sm space-y-3 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-poxpur-green/10">
          <Inbox className="h-8 w-8 text-poxpur-green" />
        </div>
        <h3 className="font-semibold text-poxpur-navy">Nenhum pedido aqui ainda</h3>
        <p className="text-sm text-muted-foreground">
          Crie seu primeiro pedido e acompanhe desde a aprovação até a entrega.
        </p>
        <Button
          onClick={onNewOrder}
          className="bg-poxpur-green text-white hover:bg-poxpur-green-dark"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Pedido
        </Button>
      </div>
    </div>
  );
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────

function KanbanCard({
  order,
  onClick,
}: {
  order: OrderWithRelations;
  onClick: () => void;
}) {
  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-1">
          <span className="text-sm font-semibold text-poxpur-navy">#{order.numero}</span>
          <span className="text-xs text-muted-foreground">
            {fmtRelativeBR(order.criado_em)}
          </span>
        </div>
        <p className="text-sm font-medium truncate">{order.customer?.nome ?? '—'}</p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="truncate">{order.seller?.nome ?? '—'}</span>
          <span className="ml-2 shrink-0 font-medium text-foreground">
            {fmtBRL.format(order.valor_total)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({
  status,
  orders,
  onCardClick,
}: {
  status: OrderStatus;
  orders: OrderWithRelations[];
  onCardClick: (id: string) => void;
}) {
  const { label, color } = ORDER_STATUS_LABELS[status];

  return (
    <div className="flex w-64 shrink-0 flex-col gap-2">
      {/* Column header */}
      <div className="flex items-center gap-2 rounded-md bg-muted/60 px-3 py-2">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
          {label}
        </span>
        <Badge variant="secondary" className="ml-auto text-xs">
          {orders.length}
        </Badge>
      </div>

      {/* Cards */}
      {orders.length === 0 ? (
        <div className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">
          Nenhum pedido
        </div>
      ) : (
        orders.map((o) => (
          <KanbanCard key={o.id} order={o} onClick={() => onCardClick(o.id)} />
        ))
      )}
    </div>
  );
}

// ─── Table View ───────────────────────────────────────────────────────────────

function TableView({
  orders,
  isLoading,
  isAdmin,
  onRowClick,
  onNewOrder,
}: {
  orders: OrderWithRelations[];
  isLoading: boolean;
  isAdmin: boolean;
  onRowClick: (id: string) => void;
  onNewOrder: () => void;
}) {
  const advanceOrder = useAdvanceOrder();

  return (
    <Card className="flex-1 overflow-hidden">
      <CardContent className="h-full overflow-auto p-0">
        {!isLoading && orders.length === 0 ? (
          <EmptyState onNewOrder={onNewOrder} />
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">#</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Cliente
                </th>
                {isAdmin && (
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Vendedor
                  </th>
                )}
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Valor
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Criado
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Ações
                </th>
              </tr>
            </thead>
            {isLoading ? (
              <SkeletonTable />
            ) : (
              <tbody>
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    className="cursor-pointer border-b transition-colors hover:bg-muted/30"
                    onClick={() => onRowClick(o.id)}
                  >
                    <td className="px-4 py-3 font-medium text-poxpur-navy">#{o.numero}</td>
                    <td className="px-4 py-3">{o.customer?.nome ?? '—'}</td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-muted-foreground">
                        {o.seller?.nome ?? '—'}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right font-medium">
                      {fmtBRL.format(o.valor_total)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>{fmtRelativeBR(o.criado_em)}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {fmtDateTime.format(new Date(o.criado_em))}
                        </TooltipContent>
                      </Tooltip>
                    </td>
                    <td
                      className="px-4 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onRowClick(o.id)}>
                            Detalhes
                          </DropdownMenuItem>
                          {isAdmin &&
                            o.status !== 'cancelado' &&
                            o.status !== 'concluido' &&
                            o.status !== 'recusado' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-rose-600 focus:text-rose-600"
                                  onClick={() =>
                                    void advanceOrder.mutateAsync({
                                      id: o.id,
                                      newStatus: 'cancelado',
                                    })
                                  }
                                >
                                  Cancelar pedido
                                </DropdownMenuItem>
                              </>
                            )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Orders() {
  const isAdmin = useIsAdmin();
  const [params, setParams] = useSearchParams();

  // ── Filters state ──
  const [search, setSearch] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<OrderStatus[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>({ label: 'Todos', days: null });
  const [viewMode, setViewMode] = useState<ViewMode>('tabela');

  // ── Modals state — initialize from ?new=1 search param ──
  const newRequested = params.get('new') === '1';
  const [newOrderOpen, setNewOrderOpen] = useState(newRequested);
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Clean up ?new=1 from URL after reading it
  useEffect(() => {
    if (newRequested) {
      params.delete('new');
      setParams(params, { replace: true });
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Data ──
  const { data: orders = [], isLoading } = useOrders({
    search: search || undefined,
    status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
    sellerId: selectedSellerId || undefined,
    periodDays: selectedPeriod.days ?? undefined,
  });
  const { data: sellers = [] } = useSellers();

  const handleRowClick = (id: string) => {
    setDetailOrderId(id);
    setDetailOpen(true);
  };

  const toggleStatus = (status: OrderStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
    );
  };

  // Group by status for Kanban
  const ordersByStatus = KANBAN_STATUSES.reduce<Record<string, OrderWithRelations[]>>(
    (acc, status) => {
      acc[status] = orders.filter((o) => o.status === status);
      return acc;
    },
    {} as Record<string, OrderWithRelations[]>,
  );

  // Also include cancelado/recusado in kanban if they appear
  const canceladoOrders = orders.filter((o) => o.status === 'cancelado');
  const recusadoOrders = orders.filter((o) => o.status === 'recusado');

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden p-6">
      {/* ── Top bar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-poxpur-navy">Pedidos</h1>
          {!isLoading && (
            <Badge
              variant="secondary"
              className="rounded-full px-2.5 py-0.5 text-xs font-medium"
            >
              {orders.length}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-md border">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-9 w-9 rounded-r-none border-r"
                  onClick={() => setViewMode('kanban')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Kanban</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === 'tabela' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-9 w-9 rounded-l-none"
                  onClick={() => setViewMode('tabela')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Tabela</TooltipContent>
            </Tooltip>
          </div>

          <Button
            onClick={() => setNewOrderOpen(true)}
            className="bg-poxpur-green text-white hover:bg-poxpur-green-dark"
          >
            <Plus className="h-4 w-4" />
            Novo Pedido
          </Button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nº ou cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 sm:w-56"
          />
        </div>

        {/* Status filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-1">
              {selectedStatuses.length > 0 ? (
                <>Status ({selectedStatuses.length})</>
              ) : (
                'Todos os status'
              )}
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((status) => {
              const { label, color } = ORDER_STATUS_LABELS[status];
              const isChecked = selectedStatuses.includes(status);
              return (
                <DropdownMenuItem
                  key={status}
                  className="flex items-center gap-2"
                  onSelect={(e) => {
                    e.preventDefault();
                    toggleStatus(status);
                  }}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${isChecked ? 'bg-poxpur-green border-poxpur-green text-white' : 'border-muted-foreground'}`}
                  >
                    {isChecked ? '✓' : ''}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${color}`}>{label}</span>
                </DropdownMenuItem>
              );
            })}
            {selectedStatuses.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-muted-foreground"
                  onSelect={() => setSelectedStatuses([])}
                >
                  Limpar filtro
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Seller filter (admin only) */}
        {isAdmin && sellers.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-1">
                {selectedSellerId
                  ? sellers.find((s) => s.id === selectedSellerId)?.nome ?? 'Vendedor'
                  : 'Todos vendedores'}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => setSelectedSellerId('')}>
                Todos vendedores
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {sellers.map((s) => (
                <DropdownMenuItem
                  key={s.id}
                  onSelect={() => setSelectedSellerId(s.id)}
                  className={selectedSellerId === s.id ? 'font-medium' : ''}
                >
                  {s.nome}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Period filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-1">
              {selectedPeriod.label}
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {PERIOD_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt.label}
                onSelect={() => setSelectedPeriod(opt)}
                className={selectedPeriod.label === opt.label ? 'font-medium' : ''}
              >
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Main content ── */}
      {viewMode === 'tabela' ? (
        <TableView
          orders={orders}
          isLoading={isLoading}
          isAdmin={isAdmin}
          onRowClick={handleRowClick}
          onNewOrder={() => setNewOrderOpen(true)}
        />
      ) : (
        /* Kanban view */
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <SkeletonKanban />
          ) : orders.length === 0 ? (
            <EmptyState onNewOrder={() => setNewOrderOpen(true)} />
          ) : (
            <div className="h-full overflow-x-auto pb-4">
              <div className="flex gap-4 min-w-max">
                {KANBAN_STATUSES.map((status) => (
                  <KanbanColumn
                    key={status}
                    status={status}
                    orders={ordersByStatus[status] ?? []}
                    onCardClick={handleRowClick}
                  />
                ))}
                {recusadoOrders.length > 0 && (
                  <KanbanColumn
                    status="recusado"
                    orders={recusadoOrders}
                    onCardClick={handleRowClick}
                  />
                )}
                {canceladoOrders.length > 0 && (
                  <KanbanColumn
                    status="cancelado"
                    orders={canceladoOrders}
                    onCardClick={handleRowClick}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      <NewOrderModal open={newOrderOpen} onOpenChange={setNewOrderOpen} />

      <OrderDetailSheet
        orderId={detailOrderId}
        open={detailOpen}
        onOpenChange={(v) => {
          setDetailOpen(v);
          if (!v) setDetailOrderId(null);
        }}
      />
    </div>
  );
}
