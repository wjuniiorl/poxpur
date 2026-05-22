import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { useCustomers, useDeleteCustomer } from '@/hooks/useCustomers';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { fmtRelativeBR } from '@/lib/format';
import { CustomerFormModal } from '@/components/customers/CustomerFormModal';
import { CustomerDetailSheet } from '@/components/customers/CustomerDetailSheet';
import type { PoxpurCustomer } from '@/types/database';

// ─── Skeleton rows ────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b">
          {Array.from({ length: 6 }).map((__, j) => (
            <td key={j} className="px-4 py-3">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
          <td className="px-4 py-3">
            <div className="flex gap-1">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────

function DeleteConfirmDialog({
  customer,
  open,
  onOpenChange,
}: {
  customer: PoxpurCustomer | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const deleteCustomer = useDeleteCustomer();

  const handleConfirm = async () => {
    if (!customer) return;
    await deleteCustomer.mutateAsync(customer.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remover cliente</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja remover <strong>{customer?.nome}</strong>? Esta ação não pode
            ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={deleteCustomer.isPending}
            onClick={handleConfirm}
          >
            {deleteCustomer.isPending ? 'Removendo...' : 'Remover'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Customers() {
  const { data: customers, isLoading } = useCustomers();
  const isAdmin = useIsAdmin();
  const [params, setParams] = useSearchParams();

  const newRequested = params.get('new') === '1';
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(newRequested);
  const [editCustomer, setEditCustomer] = useState<PoxpurCustomer | null>(null);
  const [detailCustomer, setDetailCustomer] = useState<PoxpurCustomer | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PoxpurCustomer | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const cleanedRef = useRef(false);

  // Clean up ?new=1 from URL after reading it
  useEffect(() => {
    if (newRequested && !cleanedRef.current) {
      cleanedRef.current = true;
      params.delete('new');
      setParams(params, { replace: true });
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = (customers ?? []).filter((c) =>
    c.nome.toLowerCase().includes(search.toLowerCase()),
  );

  const handleNewCustomer = () => {
    setEditCustomer(null);
    setFormOpen(true);
  };

  const handleEdit = (c: PoxpurCustomer) => {
    setEditCustomer(c);
    setFormOpen(true);
  };

  const handleDelete = (c: PoxpurCustomer) => {
    setDeleteTarget(c);
    setDeleteOpen(true);
  };

  const handleNameClick = (c: PoxpurCustomer) => {
    setDetailCustomer(c);
    setDetailOpen(true);
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden p-6">
      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-poxpur-navy">Clientes</h1>
          {customers && (
            <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-xs font-medium">
              {customers.length}
            </Badge>
          )}
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 sm:w-64"
            />
          </div>
          <Button
            onClick={handleNewCustomer}
            className="bg-poxpur-green text-white hover:bg-poxpur-green-dark"
          >
            <Plus className="h-4 w-4" />
            Novo cliente
          </Button>
        </div>
      </div>

      {/* ── Table ── */}
      <Card className="flex-1 overflow-hidden">
        <CardContent className="h-full overflow-auto p-0">
          {!isLoading && filtered.length === 0 && !search ? (
            <div className="grid h-full min-h-64 place-items-center">
              <div className="max-w-sm space-y-3 text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-poxpur-green/10">
                  <Building2 className="h-8 w-8 text-poxpur-green" />
                </div>
                <h3 className="font-semibold text-poxpur-navy">Comece adicionando seu primeiro cliente</h3>
                <p className="text-sm text-muted-foreground">
                  Cadastre clientes para vincular pedidos, conversas de WhatsApp e tarefas.
                </p>
                <Button
                  onClick={handleNewCustomer}
                  className="bg-poxpur-green text-white hover:bg-poxpur-green-dark"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Novo cliente
                </Button>
              </div>
            </div>
          ) : !isLoading && filtered.length === 0 && search ? (
            <div className="grid h-32 place-items-center">
              <p className="text-sm text-muted-foreground">
                Nenhum resultado para &quot;{search}&quot;
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Telefone
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Cidade
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tags</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Pedidos
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Criado
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <SkeletonRows />
                ) : (
                  filtered.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleNameClick(c)}
                          className="font-medium text-poxpur-navy hover:underline"
                        >
                          {c.nome}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {c.telefone ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {c.cidade
                          ? [c.cidade, c.estado].filter(Boolean).join('/')
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {c.tags.length > 0
                            ? c.tags.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {tag}
                                </Badge>
                              ))
                            : <span className="text-muted-foreground">—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">—</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {fmtRelativeBR(c.criado_em)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleEdit(c)}
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {isAdmin && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(c)}
                              title="Remover"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* ── Modals / Sheets ── */}
      <CustomerFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        customer={editCustomer}
      />

      <CustomerDetailSheet
        customer={detailCustomer}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={(c) => {
          setDetailOpen(false);
          handleEdit(c);
        }}
      />

      <DeleteConfirmDialog
        customer={deleteTarget}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  );
}
