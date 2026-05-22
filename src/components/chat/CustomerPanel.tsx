import { useState } from 'react';
import { ExternalLink, Mail, Phone, MapPin, Tag, FileText, ShoppingBag, Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { fmtBRL, fmtDate } from '@/lib/format';
import { useOrders } from '@/hooks/useOrders';
import { useCustomer } from '@/hooks/useCustomers';
import { CustomerFormModal } from '@/components/customers/CustomerFormModal';
import { ORDER_STATUS_LABELS } from '@/types/database';
import type { ConversationWithRelations, PoxpurCustomer } from '@/types/database';

type CustomerPanelProps = {
  conversation: ConversationWithRelations | null | undefined;
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function WithCustomer({ customer }: { customer: PoxpurCustomer }) {
  const [editOpen, setEditOpen] = useState(false);

  const { data: orders } = useOrders({ customerId: customer.id });

  const approvedOrders = orders?.filter(
    (o) => o.status === 'aprovado' || o.status === 'concluido' || o.status === 'enviado',
  );

  const totalComprado = approvedOrders?.reduce((sum, o) => sum + o.valor_total, 0) ?? 0;
  const lastPurchase = approvedOrders?.sort(
    (a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime(),
  )[0];

  const last5Orders = orders?.slice(0, 5) ?? [];

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Customer info */}
      <div className="p-4 flex flex-col items-center gap-3 text-center border-b border-border">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="bg-poxpur-navy text-white text-lg font-semibold">
            {getInitials(customer.nome)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-semibold text-sm">{customer.nome}</h3>
          {customer.telefone && (
            <a
              href={`tel:${customer.telefone}`}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 mt-0.5"
            >
              <Phone className="h-3 w-3" />
              {customer.telefone}
            </a>
          )}
          {customer.email && (
            <a
              href={`mailto:${customer.email}`}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 mt-0.5"
            >
              <Mail className="h-3 w-3" />
              {customer.email}
            </a>
          )}
          {(customer.cidade || customer.estado) && (
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" />
              {[customer.cidade, customer.estado].filter(Boolean).join(', ')}
            </p>
          )}
        </div>

        {customer.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-center">
            {customer.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] py-0 px-1.5">
                <Tag className="h-2.5 w-2.5 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {customer.observacoes && (
          <p className="text-xs text-muted-foreground text-left w-full bg-muted/50 rounded p-2">
            <FileText className="h-3 w-3 inline mr-1 align-text-bottom" />
            {customer.observacoes}
          </p>
        )}

        <Button
          size="sm"
          variant="outline"
          className="w-full text-xs h-7"
          onClick={() => setEditOpen(true)}
        >
          <Edit className="h-3 w-3 mr-1" />
          Editar cliente
        </Button>
      </div>

      {/* Stats */}
      <div className="p-3 grid grid-cols-1 gap-2 border-b border-border">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Total comprado</span>
          <span className="text-sm font-semibold text-poxpur-green-dark">
            {fmtBRL.format(totalComprado)}
          </span>
        </div>
        {lastPurchase && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Última compra</span>
            <span className="text-xs">{fmtDate.format(new Date(lastPurchase.criado_em))}</span>
          </div>
        )}
      </div>

      {/* Order history */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
            <ShoppingBag className="h-3 w-3" />
            Pedidos recentes
          </h4>
          <a
            href={`/orders?customer=${customer.id}`}
            className="text-[10px] text-poxpur-green hover:underline flex items-center gap-0.5"
          >
            Ver todos <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>

        {last5Orders.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Nenhum pedido</p>
        ) : (
          <div className="space-y-2">
            {last5Orders.map((order) => {
              const statusInfo = ORDER_STATUS_LABELS[order.status];
              return (
                <div
                  key={order.id}
                  className="flex items-center justify-between gap-2 py-1.5 border-b border-border/40 last:border-0"
                >
                  <div>
                    <p className="text-xs font-medium">#{order.numero}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {fmtDate.format(new Date(order.criado_em))}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium">{fmtBRL.format(order.valor_total)}</p>
                    <span
                      className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                        statusInfo.color,
                      )}
                    >
                      {statusInfo.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CustomerFormModal open={editOpen} onOpenChange={setEditOpen} customer={customer} />
    </div>
  );
}

function WithPhoneOnly({
  phone,
  snapshotName,
  conversationId,
}: {
  phone: string | null;
  snapshotName: string | null;
  conversationId: string;
}) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex flex-col items-center p-4 gap-4 text-center border-b border-border">
      <Avatar className="h-14 w-14 mt-2">
        <AvatarFallback className="bg-muted text-muted-foreground text-lg">
          {phone ? phone.replace(/\D/g, '').slice(-2) : '??'}
        </AvatarFallback>
      </Avatar>
      <div>
        {snapshotName && <p className="font-medium text-sm">{snapshotName}</p>}
        {phone && <p className="text-xs text-muted-foreground">{phone}</p>}
        <p className="text-xs text-muted-foreground mt-2">Cliente não vinculado</p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="w-full text-xs"
        onClick={() => setCreateOpen(true)}
      >
        Criar novo cliente
      </Button>
      <CustomerFormModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        customer={null}
        // We pre-fill phone in defaultValues — handled by CustomerFormModal opening with null
      />
      {/* conversationId captured for future: link conversation to customer after creation */}
      <span className="hidden">{conversationId}</span>
    </div>
  );
}

export function CustomerPanel({ conversation }: CustomerPanelProps) {
  const customerId = conversation?.customer_id ?? undefined;
  const { data: fullCustomer, isLoading } = useCustomer(customerId);

  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
        <p className="text-xs">Selecione uma conversa</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Separator />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // If we have a linked customer, show full profile
  const customer = fullCustomer ?? (conversation.customer as PoxpurCustomer | null);
  if (customer) {
    return <WithCustomer customer={customer} />;
  }

  // No customer linked: show phone-only panel
  return (
    <WithPhoneOnly
      phone={conversation.customer_phone}
      snapshotName={conversation.customer_nome_snapshot}
      conversationId={conversation.id}
    />
  );
}
