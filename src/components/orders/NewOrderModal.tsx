import { useState, useMemo } from 'react';
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Resolver } from 'react-hook-form';
import { z } from 'zod';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCustomers } from '@/hooks/useCustomers';
import { useProducts } from '@/hooks/useProducts';
import { useCreateOrder } from '@/hooks/useOrders';
import { fmtBRL } from '@/lib/format';
import { PAYMENT_METHOD_LABELS } from '@/types/database';
import type { PaymentMethod } from '@/types/database';

// ─── Schema ───────────────────────────────────────────────────────────────────

const orderItemSchema = z.object({
  product_id: z.string().min(1, 'Selecione um produto'),
  quantidade: z.number().min(1, 'Mínimo 1'),
  valor_unitario: z.number().min(0, 'Valor inválido'),
});

const orderSchema = z.object({
  customer_id: z.string().min(1, 'Selecione um cliente'),
  items: z.array(orderItemSchema).min(1, 'Adicione ao menos um item'),
  valor_desconto: z.number().min(0),
  valor_frete: z.number().min(0),
  forma_pagamento: z
    .enum(['pix', 'boleto', 'cartao', 'transferencia', 'a_combinar'])
    .optional()
    .nullable(),
  prazo_entrega: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
});

// Explicit form type for react-hook-form compatibility with Zod v4
type OrderFormValues = {
  customer_id: string;
  items: { product_id: string; quantidade: number; valor_unitario: number }[];
  valor_desconto: number;
  valor_frete: number;
  forma_pagamento: 'pix' | 'boleto' | 'cartao' | 'transferencia' | 'a_combinar' | null | undefined;
  prazo_entrega: string | null | undefined;
  observacoes: string | null | undefined;
};

// ─── Props ────────────────────────────────────────────────────────────────────

type NewOrderModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function NewOrderModal({ open, onOpenChange }: NewOrderModalProps) {
  const { data: customers = [] } = useCustomers();
  const { data: products = [] } = useProducts();
  const createOrder = useCreateOrder();

  const [selectedProductId, setSelectedProductId] = useState('');

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema) as Resolver<OrderFormValues>,
    defaultValues: {
      customer_id: '',
      items: [],
      valor_desconto: 0,
      valor_frete: 0,
      forma_pagamento: null,
      prazo_entrega: null,
      observacoes: null,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const rawItems = useWatch({ control: form.control, name: 'items' });
  const watchedItems = useMemo(() => rawItems ?? [], [rawItems]);
  const watchedDesconto = useWatch({ control: form.control, name: 'valor_desconto' }) ?? 0;
  const watchedFrete = useWatch({ control: form.control, name: 'valor_frete' }) ?? 0;

  const subtotal = useMemo(
    () => watchedItems.reduce((sum, item) => sum + (item.quantidade ?? 0) * (item.valor_unitario ?? 0), 0),
    [watchedItems],
  );

  const totalFinal = subtotal - Number(watchedDesconto) + Number(watchedFrete);

  const handleAddProduct = () => {
    if (!selectedProductId) return;
    const product = products.find((p) => p.id === selectedProductId);
    if (!product) return;
    append({
      product_id: product.id,
      quantidade: 1,
      valor_unitario: product.preco,
    });
    setSelectedProductId('');
  };

  const onSubmit = async (values: OrderFormValues) => {
    await createOrder.mutateAsync({
      customer_id: values.customer_id,
      forma_pagamento: values.forma_pagamento ?? null,
      prazo_entrega: values.prazo_entrega ?? null,
      observacoes: values.observacoes ?? null,
      valor_desconto: values.valor_desconto ?? 0,
      valor_frete: values.valor_frete ?? 0,
      items: values.items,
    });
    form.reset();
    onOpenChange(false);
  };

  const handleClose = () => {
    form.reset();
    setSelectedProductId('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo Pedido</DialogTitle>
          <DialogDescription>Pedido entra como Pendente de aprovação</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* ── Cliente ── */}
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Cliente
              </h3>
              <FormField
                control={form.control}
                name="customer_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente *</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        {...field}
                      >
                        <option value="">Selecione um cliente...</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nome}{c.cidade ? ` — ${c.cidade}` : ''}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* ── Itens ── */}
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Itens
              </h3>

              {/* Add item row */}
              <div className="mb-3 flex gap-2">
                <select
                  className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                >
                  <option value="">Selecione um produto para adicionar...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.sku}] {p.nome} — {fmtBRL.format(p.preco)} (estoque: {p.estoque})
                    </option>
                  ))}
                </select>
                <Button type="button" variant="outline" onClick={handleAddProduct} disabled={!selectedProductId}>
                  <Plus className="h-4 w-4" />
                  Adicionar
                </Button>
              </div>

              {/* Items error */}
              {form.formState.errors.items?.root && (
                <p className="mb-2 text-sm text-destructive">
                  {form.formState.errors.items.root.message}
                </p>
              )}
              {form.formState.errors.items?.message && (
                <p className="mb-2 text-sm text-destructive">
                  {form.formState.errors.items.message}
                </p>
              )}

              {/* Items list */}
              {fields.length > 0 && (
                <div className="overflow-hidden rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Produto</th>
                        <th className="w-24 px-3 py-2 text-left font-medium text-muted-foreground">Qtd</th>
                        <th className="w-32 px-3 py-2 text-left font-medium text-muted-foreground">Valor Unit.</th>
                        <th className="w-28 px-3 py-2 text-right font-medium text-muted-foreground">Subtotal</th>
                        <th className="w-10 px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map((field, index) => {
                        const product = products.find((p) => p.id === field.product_id);
                        const qty = watchedItems[index]?.quantidade ?? 0;
                        const unit = watchedItems[index]?.valor_unitario ?? 0;
                        return (
                          <tr key={field.id} className="border-b last:border-0">
                            <td className="px-3 py-2">
                              <span className="font-medium">{product?.nome ?? field.product_id}</span>
                              {product?.sku && (
                                <span className="ml-1 text-xs text-muted-foreground">[{product.sku}]</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <Controller
                                control={form.control}
                                name={`items.${index}.quantidade`}
                                render={({ field: f }) => (
                                  <Input
                                    type="number"
                                    min={1}
                                    className="h-8 w-20"
                                    {...f}
                                    onChange={(e) => f.onChange(Number(e.target.value))}
                                  />
                                )}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Controller
                                control={form.control}
                                name={`items.${index}.valor_unitario`}
                                render={({ field: f }) => (
                                  <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    className="h-8 w-28"
                                    {...f}
                                    onChange={(e) => f.onChange(Number(e.target.value))}
                                  />
                                )}
                              />
                            </td>
                            <td className="px-3 py-2 text-right font-medium">
                              {fmtBRL.format(qty * unit)}
                            </td>
                            <td className="px-3 py-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => remove(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {fields.length === 0 && (
                <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
                  Nenhum item adicionado ainda
                </div>
              )}
            </div>

            <Separator />

            {/* ── Totais ── */}
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Totais
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Subtotal</p>
                  <p className="text-sm font-medium">{fmtBRL.format(subtotal)}</p>
                </div>
                <div />
                <FormField
                  control={form.control}
                  name="valor_desconto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Desconto (R$)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="0,00"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="valor_frete"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frete (R$)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="0,00"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="mt-4 rounded-md bg-muted/50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total final</span>
                  <span className="text-xl font-bold text-poxpur-green">
                    {fmtBRL.format(totalFinal < 0 ? 0 : totalFinal)}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Detalhes ── */}
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Detalhes
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="forma_pagamento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Forma de pagamento</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange((e.target.value || null) as PaymentMethod | null)
                          }
                        >
                          <option value="">A definir</option>
                          {(Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][]).map(
                            ([key, label]) => (
                              <option key={key} value={key}>
                                {label}
                              </option>
                            ),
                          )}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="prazo_entrega"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prazo de entrega</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value || null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem className="mt-4">
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <textarea
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Anotações, instruções especiais..."
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createOrder.isPending}
                className="bg-poxpur-green text-white hover:bg-poxpur-green-dark"
              >
                {createOrder.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Pedido'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
