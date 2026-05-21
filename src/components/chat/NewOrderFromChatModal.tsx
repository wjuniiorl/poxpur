import { useState, useMemo } from 'react';
import { X, ShoppingCart, Loader2, User } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useCreateOrder, useSellers } from '@/hooks/useOrders';
import { useCreateCustomer } from '@/hooks/useCustomers';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { supabase } from '@/lib/supabase';
import { CustomerSection } from './CustomerSection';
import { ItemsSection } from './ItemsSection';
import type { OrderItem } from './ItemsSection';
import { TotalsSection } from './TotalsSection';
import { PaymentSection } from './PaymentSection';
import type { ConversationWithRelations, PoxpurCustomer, PaymentMethod } from '@/types/database';

// ─── Props ─────────────────────────────────────────────────────────────────────

type NewOrderFromChatModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: ConversationWithRelations;
};

// ─── Component ─────────────────────────────────────────────────────────────────

export function NewOrderFromChatModal({ open, onOpenChange, conversation }: NewOrderFromChatModalProps) {
  const { session } = useAuth();
  const isAdmin = useIsAdmin();
  const createOrder = useCreateOrder();
  const createCustomer = useCreateCustomer();
  const { data: sellers } = useSellers();

  // Customer state
  const prefilledCustomer = conversation.customer as PoxpurCustomer | null;
  const [selectedCustomer, setSelectedCustomer] = useState<PoxpurCustomer | null>(
    prefilledCustomer,
  );
  const [newCustomerData, setNewCustomerData] = useState<{
    nome: string;
    telefone: string;
    email: string;
  } | null>(null);

  // Seller state
  const [sellerId, setSellerId] = useState<string>(session?.user.id ?? '');

  // Items state
  const [items, setItems] = useState<OrderItem[]>([]);

  // Totals state
  const [desconto, setDesconto] = useState(0);
  const [descontoPercent, setDescontoPercent] = useState(0);
  const [descontoMode, setDescontoMode] = useState<'valor' | 'percent'>('valor');
  const [frete, setFrete] = useState(0);

  // Payment state
  const [formaPagamento, setFormaPagamento] = useState<PaymentMethod | null>(null);
  const [prazoEntrega, setPrazoEntrega] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Link chat history
  const [linkChat, setLinkChat] = useState(true);

  // ─── Computed totals ──────────────────────────────────────────────────────────

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.quantidade * i.valor_unitario, 0),
    [items],
  );

  const total = Math.max(0, subtotal - desconto + frete);

  // ─── Items handlers ───────────────────────────────────────────────────────────

  const handleAddItem = (item: OrderItem) => {
    setItems((prev) => [...prev, item]);
  };

  const handleUpdateItem = (index: number, patch: Partial<OrderItem>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDescontoChange = (val: number, mode: 'valor' | 'percent', pct: number) => {
    setDesconto(val);
    setDescontoMode(mode);
    setDescontoPercent(pct);
  };

  // ─── Validation ───────────────────────────────────────────────────────────────

  const getCustomerId = () => selectedCustomer?.id ?? null;
  const isValid = !!(getCustomerId() || (newCustomerData && newCustomerData.nome.trim())) && items.length > 0;

  // ─── Submit ───────────────────────────────────────────────────────────────────

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      let customerId = getCustomerId();

      // Create new customer if needed
      if (!customerId && newCustomerData && newCustomerData.nome.trim()) {
        const newCust = await createCustomer.mutateAsync({
          nome: newCustomerData.nome.trim(),
          telefone: newCustomerData.telefone || null,
          email: newCustomerData.email || null,
        });
        customerId = newCust.id;

        // Link conversation to new customer
        await supabase
          .from('conversations')
          .update({ customer_id: customerId })
          .eq('id', conversation.id);
      }

      if (!customerId) {
        toast.error('Selecione ou crie um cliente');
        return;
      }

      const effectiveSellerId = isAdmin ? sellerId : (session?.user.id ?? '');

      const order = await createOrder.mutateAsync({
        customer_id: customerId,
        seller_id: effectiveSellerId,
        items: items.map((i) => ({
          product_id: i.product_id,
          quantidade: i.quantidade,
          valor_unitario: i.valor_unitario,
        })),
        valor_desconto: desconto,
        valor_frete: frete,
        forma_pagamento: formaPagamento,
        prazo_entrega: prazoEntrega || null,
        observacoes: observacoes || null,
      });

      // Insert system message linking the order (if checkbox checked)
      if (linkChat && order) {
        const totalStr = new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(order.valor_total ?? total);

        await supabase.from('messages').insert({
          conversation_id: conversation.id,
          sender_type: 'sistema',
          tipo: 'texto',
          conteudo: `Pedido #${order.numero} criado (${totalStr}) — aguardando aprovação`,
          whatsapp_message_id: `system-order-${order.id}`,
          lida: true,
          metadata: { order_id: order.id, type: 'order_created' },
        });
      }

      onOpenChange(false);
      resetForm();
    } catch (err) {
      // createOrder mutation handles toast
      console.error('Error creating order from chat:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedCustomer(prefilledCustomer);
    setNewCustomerData(null);
    setItems([]);
    setDesconto(0);
    setDescontoPercent(0);
    setDescontoMode('valor');
    setFrete(0);
    setFormaPagamento(null);
    setPrazoEntrega('');
    setObservacoes('');
    setLinkChat(true);
    setSellerId(session?.user.id ?? '');
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) resetForm();
    onOpenChange(o);
  };

  // ─── Customer display name ────────────────────────────────────────────────────

  const customerDisplayName =
    selectedCustomer?.nome ??
    newCustomerData?.nome ??
    conversation.customer?.nome ??
    conversation.customer_nome_snapshot ??
    conversation.customer_phone ??
    'Cliente';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        {/* ── Header gradient ─────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-poxpur-navy to-poxpur-green-dark p-4 flex items-start justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-base leading-tight">
                Novo Pedido — {customerDisplayName}
              </h2>
              <p className="text-white/70 text-xs mt-0.5">
                Pedido entra como Pendente de aprovação
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleOpenChange(false)}
            className="text-white/80 hover:text-white hover:bg-white/10 h-8 w-8 shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* ── Body ────────────────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-5">
          {/* Customer section */}
          <CustomerSection
            prefilledCustomer={prefilledCustomer}
            prefilledPhone={conversation.customer_phone}
            prefilledName={conversation.customer_nome_snapshot}
            selectedCustomerId={selectedCustomer?.id ?? null}
            onSelectCustomer={setSelectedCustomer}
            newCustomerData={newCustomerData}
            onNewCustomerChange={setNewCustomerData}
          />

          <Separator />

          {/* Seller */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Vendedor responsável
            </Label>
            {isAdmin ? (
              <select
                value={sellerId}
                onChange={(e) => setSellerId(e.target.value)}
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {sellers?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-2 p-2 rounded border border-border bg-muted/30 text-sm">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span>
                  {sellers?.find((s) => s.id === session?.user.id)?.nome ?? 'Você'}
                </span>
              </div>
            )}
          </div>

          <Separator />

          {/* Items */}
          <ItemsSection
            items={items}
            onAdd={handleAddItem}
            onUpdate={handleUpdateItem}
            onRemove={handleRemoveItem}
          />

          <Separator />

          {/* Totals */}
          <TotalsSection
            subtotal={subtotal}
            desconto={desconto}
            descontoMode={descontoMode}
            descontoPercent={descontoPercent}
            frete={frete}
            total={total}
            onDescontoChange={handleDescontoChange}
            onFreteChange={setFrete}
          />

          <Separator />

          {/* Payment */}
          <PaymentSection
            formaPagemento={formaPagamento}
            prazoEntrega={prazoEntrega}
            observacoes={observacoes}
            onFormaPagamentoChange={setFormaPagamento}
            onPrazoEntregaChange={setPrazoEntrega}
            onObservacoesChange={setObservacoes}
          />
        </div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div className="border-t border-border px-4 py-3 flex items-center justify-between gap-3 shrink-0 bg-background">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={linkChat}
              onChange={(e) => setLinkChat(e.target.checked)}
              className="h-3.5 w-3.5 accent-poxpur-green"
            />
            <span className="text-xs text-muted-foreground">Vincular histórico do chat</span>
          </label>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void handleSubmit()}
              disabled={!isValid || isSubmitting}
              className="bg-poxpur-green hover:bg-poxpur-green-dark text-white gap-2 min-w-32"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4" />
                  Criar Pedido
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
