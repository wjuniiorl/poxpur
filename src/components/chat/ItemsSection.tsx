import { useState } from 'react';
import { Trash2, Plus, AlertTriangle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { fmtBRL } from '@/lib/format';
import { useProducts } from '@/hooks/useProducts';
import type { PoxpurProduct } from '@/types/database';

export type OrderItem = {
  product_id: string;
  product: PoxpurProduct;
  quantidade: number;
  valor_unitario: number;
};

type ItemsSectionProps = {
  items: OrderItem[];
  onAdd: (item: OrderItem) => void;
  onUpdate: (index: number, item: Partial<OrderItem>) => void;
  onRemove: (index: number) => void;
};

export function ItemsSection({ items, onAdd, onUpdate, onRemove }: ItemsSectionProps) {
  const [search, setSearch] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const { data: products } = useProducts();

  const filteredProducts = products?.filter((p) => {
    if (!p.ativo) return false;
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      p.nome.toLowerCase().includes(term) ||
      p.sku.toLowerCase().includes(term) ||
      (p.categoria ?? '').toLowerCase().includes(term)
    );
  });

  const handleAddProduct = (product: PoxpurProduct) => {
    const existing = items.findIndex((i) => i.product_id === product.id);
    if (existing >= 0) {
      onUpdate(existing, { quantidade: (items[existing]?.quantidade ?? 0) + 1 });
    } else {
      onAdd({
        product_id: product.id,
        product,
        quantidade: 1,
        valor_unitario: product.preco,
      });
    }
    setSearch('');
    setShowPicker(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Produtos
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => setShowPicker(!showPicker)}
        >
          <Plus className="h-3 w-3" />
          Adicionar produto
        </Button>
      </div>

      {/* Product picker */}
      {showPicker && (
        <div className="rounded-lg border border-border bg-background shadow-sm">
          <div className="p-2 border-b border-border relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produto por nome ou SKU..."
              className="pl-8 h-8 text-sm"
            />
          </div>
          <div className="max-h-44 overflow-y-auto divide-y divide-border/50">
            {filteredProducts?.slice(0, 15).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleAddProduct(p)}
                className="w-full text-left px-3 py-2 hover:bg-accent transition-colors flex items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.nome}</p>
                  <p className="text-[10px] text-muted-foreground">SKU: {p.sku}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-poxpur-green-dark">
                    {fmtBRL.format(p.preco)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">estoque: {p.estoque}</p>
                </div>
              </button>
            ))}
            {filteredProducts?.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">
                Nenhum produto encontrado
              </p>
            )}
          </div>
        </div>
      )}

      {/* Items table */}
      {items.length > 0 && (
        <div className="space-y-1.5">
          {/* Header */}
          <div className="grid grid-cols-[1fr_80px_100px_80px_32px] gap-2 text-[10px] text-muted-foreground font-medium uppercase tracking-wide px-1">
            <span>Produto</span>
            <span className="text-center">Qtd</span>
            <span className="text-center">Vlr Unit.</span>
            <span className="text-right">Subtotal</span>
            <span />
          </div>

          {items.map((item, i) => {
            const subtotal = item.quantidade * item.valor_unitario;
            const hasStockWarning = item.quantidade > item.product.estoque;

            return (
              <div
                key={item.product_id}
                className={cn(
                  'grid grid-cols-[1fr_80px_100px_80px_32px] gap-2 items-center px-1 py-1.5 rounded',
                  hasStockWarning && 'bg-amber-50',
                )}
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{item.product.nome}</p>
                  <div className="flex items-center gap-1">
                    <p className="text-[10px] text-muted-foreground">{item.product.sku}</p>
                    {hasStockWarning && (
                      <Badge
                        variant="outline"
                        className="text-[9px] py-0 px-1 border-amber-400 text-amber-600 gap-0.5"
                      >
                        <AlertTriangle className="h-2.5 w-2.5" />
                        Estoque insuf.
                      </Badge>
                    )}
                  </div>
                </div>

                <Input
                  type="number"
                  min={1}
                  value={item.quantidade}
                  onChange={(e) =>
                    onUpdate(i, { quantidade: Math.max(1, parseInt(e.target.value) || 1) })
                  }
                  className="h-7 text-xs text-center px-1"
                />

                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={item.valor_unitario}
                  onChange={(e) =>
                    onUpdate(i, { valor_unitario: Math.max(0, parseFloat(e.target.value) || 0) })
                  }
                  className="h-7 text-xs text-center px-1"
                />

                <p className="text-xs font-medium text-right">{fmtBRL.format(subtotal)}</p>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onRemove(i)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {items.length === 0 && (
        <p className="text-xs text-muted-foreground italic text-center py-2">
          Nenhum produto adicionado
        </p>
      )}
    </div>
  );
}
