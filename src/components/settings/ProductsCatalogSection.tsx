import { useState } from 'react';
import { Plus, Search, Pencil, PackageX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useProducts, useDeleteProduct } from '@/hooks/useProducts';
import { fmtBRL } from '@/lib/format';
import { ProductFormModal } from '@/components/settings/ProductFormModal';
import type { PoxpurProduct } from '@/types/database';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StockBadge({ qty }: { qty: number }) {
  if (qty === 0) {
    return (
      <Badge className="border-transparent bg-rose-100 text-rose-700 hover:bg-rose-100">
        Sem estoque
      </Badge>
    );
  }
  if (qty < 10) {
    return (
      <Badge className="border-transparent bg-amber-100 text-amber-700 hover:bg-amber-100">
        {qty} un
      </Badge>
    );
  }
  return (
    <Badge className="border-transparent bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
      {qty} un
    </Badge>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge className="border-transparent bg-poxpur-green/15 text-poxpur-green-dark hover:bg-poxpur-green/15">
      Ativo
    </Badge>
  ) : (
    <Badge variant="secondary" className="text-muted-foreground">
      Inativo
    </Badge>
  );
}

// ─── Skeleton rows ────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b">
          {Array.from({ length: 7 }).map((__, j) => (
            <td key={j} className="px-4 py-3">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Deactivate Confirm Dialog ────────────────────────────────────────────────

function DeactivateConfirmDialog({
  product,
  open,
  onOpenChange,
}: {
  product: PoxpurProduct | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const deleteProduct = useDeleteProduct();

  const handleConfirm = async () => {
    if (!product) return;
    await deleteProduct.mutateAsync(product.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Desativar produto</DialogTitle>
          <DialogDescription>
            <strong>{product?.nome}</strong> será desativado e não aparecerá mais no catálogo.
            Pedidos existentes com este produto não serão afetados.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={deleteProduct.isPending}
            onClick={handleConfirm}
          >
            {deleteProduct.isPending ? 'Desativando...' : 'Desativar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Products Catalog Section ─────────────────────────────────────────────────

export function ProductsCatalogSection() {
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<PoxpurProduct | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<PoxpurProduct | null>(null);
  const [deactivateOpen, setDeactivateOpen] = useState(false);

  const { data: products, isLoading } = useProducts(showInactive);

  const filtered = (products ?? []).filter(
    (p) =>
      p.nome.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()),
  );

  const handleNew = () => {
    setEditProduct(null);
    setFormOpen(true);
  };

  const handleEdit = (p: PoxpurProduct) => {
    setEditProduct(p);
    setFormOpen(true);
  };

  const handleDeactivate = (p: PoxpurProduct) => {
    setDeactivateTarget(p);
    setDeactivateOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardDescription>Gerencie os produtos disponíveis para pedidos</CardDescription>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border px-3 py-1.5">
            <Switch
              id="show-inactive"
              checked={showInactive}
              onCheckedChange={setShowInactive}
              className="scale-90"
            />
            <Label htmlFor="show-inactive" className="cursor-pointer text-xs text-muted-foreground">
              Mostrar inativos
            </Label>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar SKU ou nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 sm:w-52"
            />
          </div>
          <Button
            onClick={handleNew}
            className="bg-poxpur-green text-white hover:bg-poxpur-green-dark"
          >
            <Plus className="h-4 w-4" />
            Novo produto
          </Button>
        </div>
      </div>

      {/* Table */}
      {!isLoading && filtered.length === 0 ? (
        <div className={cn('grid place-items-center py-12')}>
          <div className="space-y-2 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              {search ? `Nenhum resultado para "${search}"` : 'Nenhum produto cadastrado'}
            </p>
            {!search && (
              <Button variant="outline" size="sm" onClick={handleNew}>
                <Plus className="h-3.5 w-3.5" />
                Adicionar primeiro produto
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">SKU</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Categoria</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Preço</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estoque</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows />
              ) : (
                filtered.map((p) => (
                  <tr
                    key={p.id}
                    className={cn(
                      'border-b transition-colors hover:bg-muted/30',
                      !p.ativo && 'opacity-60',
                    )}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.sku}</td>
                    <td className="px-4 py-3 font-medium">{p.nome}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.categoria ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {fmtBRL.format(p.preco)}
                    </td>
                    <td className="px-4 py-3">
                      <StockBadge qty={p.estoque} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge active={p.ativo} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handleEdit(p)}
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {p.ativo && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeactivate(p)}
                            title="Desativar"
                          >
                            <PackageX className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <ProductFormModal open={formOpen} onOpenChange={setFormOpen} product={editProduct} />
      <DeactivateConfirmDialog
        product={deactivateTarget}
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
      />
    </div>
  );
}
