import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { fmtBRL } from '@/lib/format';

type TotalsSectionProps = {
  subtotal: number;
  desconto: number;
  descontoMode: 'valor' | 'percent';
  descontoPercent: number;
  frete: number;
  total: number;
  onDescontoChange: (valor: number, mode: 'valor' | 'percent', percent: number) => void;
  onFreteChange: (frete: number) => void;
};

export function TotalsSection({
  subtotal,
  desconto,
  descontoMode,
  descontoPercent,
  frete,
  total,
  onDescontoChange,
  onFreteChange,
}: TotalsSectionProps) {
  const [mode, setMode] = useState<'valor' | 'percent'>(descontoMode);

  const handleModeToggle = (newMode: 'valor' | 'percent') => {
    setMode(newMode);
    if (newMode === 'percent') {
      // recalculate value from existing percent
      const val = subtotal * (descontoPercent / 100);
      onDescontoChange(val, 'percent', descontoPercent);
    } else {
      onDescontoChange(desconto, 'valor', desconto > 0 ? (desconto / subtotal) * 100 : 0);
    }
  };

  const handleDescontoInput = (raw: string) => {
    const num = parseFloat(raw) || 0;
    if (mode === 'percent') {
      const val = subtotal * (Math.min(100, num) / 100);
      onDescontoChange(val, 'percent', Math.min(100, num));
    } else {
      onDescontoChange(Math.min(num, subtotal), 'valor', subtotal > 0 ? (Math.min(num, subtotal) / subtotal) * 100 : 0);
    }
  };

  return (
    <div className="space-y-2 bg-muted/30 rounded-lg p-3">
      <div className="flex justify-between items-center text-sm">
        <span className="text-muted-foreground">Subtotal</span>
        <span className="font-medium">{fmtBRL.format(subtotal)}</span>
      </div>

      {/* Desconto */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground shrink-0">Desconto</span>
        <div className="flex-1" />
        <div className="flex rounded-md overflow-hidden border border-input h-7">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={`h-7 px-2 text-xs rounded-none border-r border-input ${mode === 'valor' ? 'bg-poxpur-green text-white' : ''}`}
            onClick={() => handleModeToggle('valor')}
          >
            R$
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={`h-7 px-2 text-xs rounded-none ${mode === 'percent' ? 'bg-poxpur-green text-white' : ''}`}
            onClick={() => handleModeToggle('percent')}
          >
            %
          </Button>
        </div>
        <Input
          type="number"
          min={0}
          max={mode === 'percent' ? 100 : subtotal}
          step={0.01}
          value={mode === 'percent' ? descontoPercent : desconto}
          onChange={(e) => handleDescontoInput(e.target.value)}
          className="h-7 w-24 text-xs text-right px-2"
          placeholder="0"
        />
      </div>

      {desconto > 0 && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span />
          <span className="text-rose-600">−{fmtBRL.format(desconto)}</span>
        </div>
      )}

      {/* Frete */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground shrink-0 flex-1">Frete</span>
        <Input
          type="number"
          min={0}
          step={0.01}
          value={frete}
          onChange={(e) => onFreteChange(parseFloat(e.target.value) || 0)}
          className="h-7 w-24 text-xs text-right px-2"
          placeholder="0,00"
        />
      </div>

      <Separator />

      <div className="flex justify-between items-center">
        <span className="font-semibold text-sm">Total</span>
        <span className="text-xl font-bold text-poxpur-green-dark">{fmtBRL.format(total)}</span>
      </div>
    </div>
  );
}
