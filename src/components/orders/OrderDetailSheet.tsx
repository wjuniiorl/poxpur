import { useState } from 'react';
import { Loader2, Mail, Phone, User, AlertTriangle, Package } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrder, useApproveOrder, useRejectOrder, useAdvanceOrder } from '@/hooks/useOrders';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { fmtBRL, fmtDateTime } from '@/lib/format';
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '@/types/database';
import type { OrderStatus } from '@/types/database';

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: OrderStatus }) {
  const { label, color } = ORDER_STATUS_LABELS[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>
      {label}
    </span>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

type OrderDetailSheetProps = {
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// ─── Reject Dialog ────────────────────────────────────────────────────────────

function RejectDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (motivo: string) => void;
  isPending: boolean;
}) {
  const [motivo, setMotivo] = useState('');

  const handleConfirm = () => {
    if (!motivo.trim()) return;
    onConfirm(motivo.trim());
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Recusar pedido</AlertDialogTitle>
          <AlertDialogDescription>Informe o motivo da recusa para o vendedor.</AlertDialogDescription>
        </AlertDialogHeader>
        <textarea
          className="mt-2 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          placeholder="Motivo da recusa..."
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => { setMotivo(''); onOpenChange(false); }}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={handleConfirm}
            disabled={!motivo.trim() || isPending}
          >
            {isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            Recusar pedido
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Cancel Dialog ────────────────────────────────────────────────────────────

function CancelDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar pedido</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja cancelar este pedido? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            Confirmar cancelamento
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Approve Confirm Dialog ───────────────────────────────────────────────────

function ApproveDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Aprovar pedido</AlertDialogTitle>
          <AlertDialogDescription>
            Confirma a aprovação deste pedido? O sistema verificará o estoque automaticamente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-poxpur-green text-white hover:bg-poxpur-green-dark"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            Aprovar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function OrderDetailSheet({ orderId, open, onOpenChange }: OrderDetailSheetProps) {
  const { data: order, isLoading } = useOrder(orderId ?? undefined);
  const isAdmin = useIsAdmin();

  const approveOrder = useApproveOrder();
  const rejectOrder = useRejectOrder();
  const advanceOrder = useAdvanceOrder();

  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const isTerminal =
    order?.status === 'concluido' || order?.status === 'cancelado' || order?.status === 'recusado';

  const handleApprove = async () => {
    if (!order) return;
    await approveOrder.mutateAsync({ id: order.id });
    setShowApproveDialog(false);
  };

  const handleReject = async (motivo: string) => {
    if (!order) return;
    await rejectOrder.mutateAsync({ id: order.id, motivo });
    setShowRejectDialog(false);
  };

  const handleAdvance = async (newStatus: 'enviado' | 'concluido' | 'cancelado') => {
    if (!order) return;
    await advanceOrder.mutateAsync({ id: order.id, newStatus });
    setShowCancelDialog(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-[600px]">
          {isLoading || !order ? (
            <div className="space-y-4 pt-6">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <>
              {/* ── Header ── */}
              <SheetHeader className="mb-4">
                <div className="flex items-center gap-2">
                  <SheetTitle className="text-xl">Pedido #{order.numero}</SheetTitle>
                  <StatusBadge status={order.status} />
                </div>
                <SheetDescription>
                  Criado em {fmtDateTime.format(new Date(order.criado_em))}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-4">
                {/* ── Cliente ── */}
                <div className="rounded-md border p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Cliente
                  </p>
                  {order.customer ? (
                    <div className="space-y-1">
                      <p className="font-medium">{order.customer.nome}</p>
                      {order.customer.telefone && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" />
                          {order.customer.telefone}
                        </div>
                      )}
                      {order.customer.email && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Mail className="h-3.5 w-3.5" />
                          {order.customer.email}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">—</p>
                  )}
                </div>

                {/* ── Vendedor ── */}
                <div className="rounded-md border p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Vendedor
                  </p>
                  {order.seller ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-poxpur-navy/10 text-poxpur-navy text-xs">
                          {order.seller.nome
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{order.seller.nome}</p>
                        <Badge variant="secondary" className="text-xs">
                          {order.seller.role}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      Vendedor não encontrado
                    </div>
                  )}
                </div>

                {/* ── Itens ── */}
                <div className="rounded-md border">
                  <div className="border-b px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Itens do pedido
                    </p>
                  </div>
                  {order.items && order.items.length > 0 ? (
                    <>
                      <table className="w-full text-sm">
                        <thead className="bg-muted/30">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                              Produto
                            </th>
                            <th className="w-16 px-3 py-2 text-center font-medium text-muted-foreground">
                              Qtd
                            </th>
                            <th className="w-24 px-3 py-2 text-right font-medium text-muted-foreground">
                              Unit.
                            </th>
                            <th className="w-24 px-3 py-2 text-right font-medium text-muted-foreground">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.items.map((item) => (
                            <tr key={item.id} className="border-t">
                              <td className="px-3 py-2">
                                <span className="font-medium">
                                  {item.product?.nome ?? '—'}
                                </span>
                                {item.product?.sku && (
                                  <span className="ml-1 text-xs text-muted-foreground">
                                    [{item.product.sku}]
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-center">{item.quantidade}</td>
                              <td className="px-3 py-2 text-right">
                                {fmtBRL.format(item.valor_unitario)}
                              </td>
                              <td className="px-3 py-2 text-right font-medium">
                                {fmtBRL.format(item.valor_total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {/* Totais footer */}
                      <div className="border-t bg-muted/20 px-3 py-2 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span>{fmtBRL.format(order.valor_subtotal)}</span>
                        </div>
                        {order.valor_desconto > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Desconto</span>
                            <span className="text-rose-600">
                              -{fmtBRL.format(order.valor_desconto)}
                            </span>
                          </div>
                        )}
                        {order.valor_frete > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Frete</span>
                            <span>+{fmtBRL.format(order.valor_frete)}</span>
                          </div>
                        )}
                        <div className="flex justify-between border-t pt-1 font-semibold">
                          <span>Total</span>
                          <span className="text-poxpur-green">
                            {fmtBRL.format(order.valor_total)}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                      <Package className="h-4 w-4" />
                      Nenhum item
                    </div>
                  )}
                </div>

                {/* ── Detalhes ── */}
                <div className="rounded-md border p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Detalhes
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Pagamento: </span>
                      <span>
                        {order.forma_pagamento
                          ? PAYMENT_METHOD_LABELS[order.forma_pagamento]
                          : 'A definir'}
                      </span>
                    </div>
                    {order.prazo_entrega && (
                      <div>
                        <span className="text-muted-foreground">Prazo entrega: </span>
                        <span>{order.prazo_entrega}</span>
                      </div>
                    )}
                    {order.aprovado_em && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Aprovado em: </span>
                        <span>{fmtDateTime.format(new Date(order.aprovado_em))}</span>
                      </div>
                    )}
                    {order.observacoes && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Observações: </span>
                        <span className="whitespace-pre-wrap">{order.observacoes}</span>
                      </div>
                    )}
                  </div>

                  {/* Motivo recusa */}
                  {order.motivo_recusa && (
                    <div className="mt-3 rounded-md bg-rose-50 p-3 text-sm text-rose-700 border border-rose-200">
                      <div className="flex items-center gap-1.5 font-medium mb-1">
                        <AlertTriangle className="h-4 w-4" />
                        Motivo da recusa
                      </div>
                      {order.motivo_recusa}
                    </div>
                  )}
                </div>

                {/* ── Ações (admin) ── */}
                {isAdmin && !isTerminal && (
                  <>
                    <Separator />
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Ações
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {order.status === 'pendente_aprovacao' && (
                          <>
                            <Button
                              size="sm"
                              className="bg-poxpur-green text-white hover:bg-poxpur-green-dark"
                              onClick={() => setShowApproveDialog(true)}
                              disabled={approveOrder.isPending}
                            >
                              {approveOrder.isPending && (
                                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                              )}
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setShowRejectDialog(true)}
                              disabled={rejectOrder.isPending}
                            >
                              Recusar
                            </Button>
                            <Button size="sm" variant="outline" disabled title="Em breve">
                              Editar (em breve)
                            </Button>
                          </>
                        )}

                        {(order.status === 'aprovado' || order.status === 'aguardando_fabrica') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleAdvance('enviado')}
                            disabled={advanceOrder.isPending}
                          >
                            {advanceOrder.isPending && (
                              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                            )}
                            Marcar como enviado
                          </Button>
                        )}

                        {order.status === 'enviado' && (
                          <Button
                            size="sm"
                            className="bg-emerald-600 text-white hover:bg-emerald-700"
                            onClick={() => void handleAdvance('concluido')}
                            disabled={advanceOrder.isPending}
                          >
                            {advanceOrder.isPending && (
                              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                            )}
                            Marcar como concluído
                          </Button>
                        )}

                        {/* Cancel always visible for non-terminal */}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          onClick={() => setShowCancelDialog(true)}
                          disabled={advanceOrder.isPending}
                        >
                          Cancelar pedido
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Dialogs ── */}
      <ApproveDialog
        open={showApproveDialog}
        onOpenChange={setShowApproveDialog}
        onConfirm={handleApprove}
        isPending={approveOrder.isPending}
      />
      <RejectDialog
        open={showRejectDialog}
        onOpenChange={setShowRejectDialog}
        onConfirm={handleReject}
        isPending={rejectOrder.isPending}
      />
      <CancelDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        onConfirm={() => void handleAdvance('cancelado')}
        isPending={advanceOrder.isPending}
      />
    </>
  );
}
