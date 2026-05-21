import { useState } from 'react';
import { User, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCustomers } from '@/hooks/useCustomers';
import type { PoxpurCustomer } from '@/types/database';

type CustomerSectionProps = {
  prefilledCustomer: PoxpurCustomer | null;
  prefilledPhone: string | null;
  prefilledName: string | null;
  selectedCustomerId: string | null;
  onSelectCustomer: (customer: PoxpurCustomer | null) => void;
  newCustomerData: { nome: string; telefone: string; email: string } | null;
  onNewCustomerChange: (data: { nome: string; telefone: string; email: string } | null) => void;
};

export function CustomerSection({
  prefilledCustomer,
  prefilledPhone,
  prefilledName,
  selectedCustomerId,
  onSelectCustomer,
  newCustomerData,
  onNewCustomerChange,
}: CustomerSectionProps) {
  const [mode, setMode] = useState<'prefilled' | 'picker' | 'new'>(
    prefilledCustomer ? 'prefilled' : 'picker',
  );
  const [search, setSearch] = useState('');
  const { data: customers } = useCustomers();

  const filteredCustomers = customers?.filter((c) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      c.nome.toLowerCase().includes(term) ||
      (c.telefone ?? '').toLowerCase().includes(term) ||
      (c.email ?? '').toLowerCase().includes(term)
    );
  });

  if (mode === 'prefilled' && prefilledCustomer) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Cliente
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={() => setMode('picker')}
          >
            Trocar
          </Button>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
          <div className="h-8 w-8 rounded-full bg-poxpur-navy flex items-center justify-center shrink-0">
            <User className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{prefilledCustomer.nome}</p>
            {prefilledCustomer.telefone && (
              <p className="text-xs text-muted-foreground">{prefilledCustomer.telefone}</p>
            )}
            {prefilledCustomer.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {prefilledCustomer.tags.map((t) => (
                  <Badge key={t} variant="secondary" className="text-[10px] py-0 px-1">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'new') {
    const data = newCustomerData ?? { nome: prefilledName ?? '', telefone: prefilledPhone ?? '', email: '' };
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Novo cliente
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={() => { setMode('picker'); onNewCustomerChange(null); }}
          >
            <X className="h-3 w-3 mr-1" /> Cancelar
          </Button>
        </div>
        <div className="space-y-2">
          <div>
            <Label className="text-xs">Nome *</Label>
            <Input
              value={data.nome}
              onChange={(e) => onNewCustomerChange({ ...data, nome: e.target.value })}
              placeholder="Nome do cliente"
              className="h-8 text-sm mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Telefone</Label>
              <Input
                value={data.telefone}
                onChange={(e) => onNewCustomerChange({ ...data, telefone: e.target.value })}
                placeholder="+5511..."
                className="h-8 text-sm mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">E-mail</Label>
              <Input
                value={data.email}
                onChange={(e) => onNewCustomerChange({ ...data, email: e.target.value })}
                placeholder="email@empresa.com"
                className="h-8 text-sm mt-1"
                type="email"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Picker mode
  return (
    <div className="space-y-3">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Cliente
      </Label>

      {/* Show selected */}
      {selectedCustomerId && customers && (
        () => {
          const sel = customers.find((c) => c.id === selectedCustomerId);
          if (!sel) return null;
          return (
            <div className="flex items-center gap-2 p-2 rounded border border-poxpur-green/40 bg-poxpur-green/5">
              <User className="h-4 w-4 text-poxpur-green shrink-0" />
              <span className="text-sm font-medium flex-1 truncate">{sel.nome}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                onClick={() => onSelectCustomer(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          );
        }
      )()}

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar cliente por nome ou telefone..."
          className="pl-8 h-8 text-sm"
        />
      </div>

      <div className="max-h-40 overflow-y-auto rounded-md border border-border divide-y divide-border/50">
        {filteredCustomers?.slice(0, 20).map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => { onSelectCustomer(c); setMode('prefilled'); }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2"
          >
            <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-medium truncate block">{c.nome}</span>
              {c.telefone && <span className="text-xs text-muted-foreground">{c.telefone}</span>}
            </div>
          </button>
        ))}
        {filteredCustomers?.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3">
            Nenhum cliente encontrado
          </p>
        )}
      </div>

      <Separator />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full text-xs h-8"
        onClick={() => {
          setMode('new');
          onNewCustomerChange({ nome: prefilledName ?? '', telefone: prefilledPhone ?? '', email: '' });
        }}
      >
        + Criar novo cliente
      </Button>
    </div>
  );
}
