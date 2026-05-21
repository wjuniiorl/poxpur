import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MessageSquarePlus, User, Phone } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useCustomers } from '@/hooks/useCustomers';
import { useCreateConversation } from '@/hooks/useConversations';
import { cn } from '@/lib/utils';

const schema = z.object({
  phone: z
    .string()
    .min(8, 'Telefone muito curto')
    .regex(/^[+0-9\s()-]+$/, 'Apenas números, espaços, +, -, ()'),
  nome: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (conversationId: string) => void;
};

export function NewConversationDialog({ open, onOpenChange, onCreated }: Props) {
  const [mode, setMode] = useState<'pick' | 'new'>('pick');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const { data: customers } = useCustomers();
  const create = useCreateConversation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { phone: '', nome: '' },
  });

  const filteredCustomers = (customers ?? []).filter((c) => {
    if (!customerSearch) return true;
    const q = customerSearch.toLowerCase();
    return (
      c.nome.toLowerCase().includes(q) ||
      (c.telefone ?? '').toLowerCase().includes(q)
    );
  });

  function handleClose() {
    reset();
    setMode('pick');
    setCustomerSearch('');
    setSelectedCustomerId(null);
    onOpenChange(false);
  }

  async function handleStartWithCustomer() {
    if (!selectedCustomerId) return;
    const customer = customers?.find((c) => c.id === selectedCustomerId);
    if (!customer?.telefone) return;
    const result = await create.mutateAsync({
      customerId: customer.id,
      phone: customer.telefone,
      nomeSnapshot: customer.nome,
      assignToMe: true,
    });
    onCreated(result.id);
    handleClose();
  }

  async function handleStartNew(values: FormValues) {
    const result = await create.mutateAsync({
      phone: values.phone,
      nomeSnapshot: values.nome || undefined,
      assignToMe: true,
    });
    onCreated(result.id);
    handleClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : handleClose())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-poxpur-navy">
            <MessageSquarePlus className="h-5 w-5 text-poxpur-green" />
            Nova conversa
          </DialogTitle>
          <DialogDescription>
            Escolha um cliente existente ou inicie com um telefone novo.
          </DialogDescription>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex gap-1 p-1 bg-secondary rounded-lg">
          <button
            type="button"
            onClick={() => setMode('pick')}
            className={cn(
              'flex-1 text-xs font-medium py-1.5 rounded-md transition-colors',
              mode === 'pick' ? 'bg-white text-poxpur-navy shadow-sm' : 'text-muted-foreground',
            )}
          >
            <User className="h-3.5 w-3.5 inline mr-1" /> Cliente existente
          </button>
          <button
            type="button"
            onClick={() => setMode('new')}
            className={cn(
              'flex-1 text-xs font-medium py-1.5 rounded-md transition-colors',
              mode === 'new' ? 'bg-white text-poxpur-navy shadow-sm' : 'text-muted-foreground',
            )}
          >
            <Phone className="h-3.5 w-3.5 inline mr-1" /> Telefone novo
          </button>
        </div>

        {mode === 'pick' ? (
          <div className="space-y-3">
            <Input
              placeholder="Buscar cliente por nome ou telefone..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="h-9"
            />

            <div className="max-h-72 overflow-y-auto border border-border rounded-lg divide-y divide-border">
              {filteredCustomers.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-8">
                  Nenhum cliente encontrado.{' '}
                  <button
                    type="button"
                    onClick={() => setMode('new')}
                    className="text-poxpur-green hover:underline"
                  >
                    Iniciar com telefone novo?
                  </button>
                </div>
              ) : (
                filteredCustomers.slice(0, 20).map((c) => {
                  const initials = c.nome
                    .split(' ')
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join('')
                    .toUpperCase();
                  const isSelected = selectedCustomerId === c.id;
                  const disabled = !c.telefone;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => setSelectedCustomerId(c.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 hover:bg-secondary text-left transition-colors',
                        isSelected && 'bg-poxpur-green/10',
                        disabled && 'opacity-50 cursor-not-allowed',
                      )}
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-poxpur-navy text-white text-[10px]">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{c.nome}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {c.telefone ?? 'Sem telefone'}
                          {c.cidade ? ` · ${c.cidade}` : ''}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleStartWithCustomer}
                disabled={!selectedCustomerId || create.isPending}
                className="bg-poxpur-green hover:bg-poxpur-green-dark text-white"
              >
                {create.isPending ? 'Iniciando...' : 'Iniciar conversa'}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit(handleStartNew)} className="space-y-3" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                placeholder="+55 11 99999-9999"
                {...register('phone')}
                aria-invalid={!!errors.phone}
              />
              {errors.phone && (
                <p className="text-xs text-destructive">{errors.phone.message}</p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Aceita formato BR (11 dígitos) ou internacional com +.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome do contato (opcional)</Label>
              <Input id="nome" placeholder="Nome do cliente" {...register('nome')} />
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || create.isPending}
                className="bg-poxpur-green hover:bg-poxpur-green-dark text-white"
              >
                {isSubmitting || create.isPending ? 'Iniciando...' : 'Iniciar conversa'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
