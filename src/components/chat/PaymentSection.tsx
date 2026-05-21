import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { PAYMENT_METHOD_LABELS } from '@/types/database';
import type { PaymentMethod } from '@/types/database';

type PaymentSectionProps = {
  formaPagemento: PaymentMethod | null;
  prazoEntrega: string;
  observacoes: string;
  onFormaPagamentoChange: (v: PaymentMethod | null) => void;
  onPrazoEntregaChange: (v: string) => void;
  onObservacoesChange: (v: string) => void;
};

export function PaymentSection({
  formaPagemento,
  prazoEntrega,
  observacoes,
  onFormaPagamentoChange,
  onPrazoEntregaChange,
  onObservacoesChange,
}: PaymentSectionProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {/* Forma de Pagamento */}
        <div className="space-y-1">
          <Label className="text-xs">Forma de pagamento</Label>
          <select
            value={formaPagemento ?? ''}
            onChange={(e) =>
              onFormaPagamentoChange((e.target.value as PaymentMethod) || null)
            }
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">A combinar</option>
            {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((k) => (
              <option key={k} value={k}>
                {PAYMENT_METHOD_LABELS[k]}
              </option>
            ))}
          </select>
        </div>

        {/* Prazo de entrega */}
        <div className="space-y-1">
          <Label className="text-xs">Prazo de entrega</Label>
          <Input
            type="date"
            value={prazoEntrega}
            onChange={(e) => onPrazoEntregaChange(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* Observações */}
      <div className="space-y-1">
        <Label className="text-xs">Observações</Label>
        <textarea
          value={observacoes}
          onChange={(e) => onObservacoesChange(e.target.value)}
          placeholder="Instruções especiais, detalhes do pedido..."
          rows={3}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
        />
      </div>
    </div>
  );
}
