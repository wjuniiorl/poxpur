import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { useCreateCustomer, useUpdateCustomer } from '@/hooks/useCustomers';
import type { PoxpurCustomer } from '@/types/database';

// ─── Schema ──────────────────────────────────────────────────────────────────

const customerSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  telefone: z.string().optional().or(z.literal('')),
  email: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || z.string().email().safeParse(v).success, {
      message: 'E-mail inválido',
    }),
  cidade: z.string().optional().or(z.literal('')),
  estado: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || v.length <= 2, { message: 'Use a sigla do estado (ex: SP)' }),
  tags: z.string().optional().or(z.literal('')),
  observacoes: z.string().optional().or(z.literal('')),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

// ─── Props ───────────────────────────────────────────────────────────────────

type CustomerFormModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: PoxpurCustomer | null;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function CustomerFormModal({ open, onOpenChange, customer }: CustomerFormModalProps) {
  const isEdit = !!customer;
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      nome: '',
      telefone: '',
      email: '',
      cidade: '',
      estado: '',
      tags: '',
      observacoes: '',
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (customer) {
      form.reset({
        nome: customer.nome,
        telefone: customer.telefone ?? '',
        email: customer.email ?? '',
        cidade: customer.cidade ?? '',
        estado: customer.estado ?? '',
        tags: customer.tags.join(', '),
        observacoes: customer.observacoes ?? '',
      });
    } else {
      form.reset({
        nome: '',
        telefone: '',
        email: '',
        cidade: '',
        estado: '',
        tags: '',
        observacoes: '',
      });
    }
  }, [customer, form]);

  const isPending = createCustomer.isPending || updateCustomer.isPending;

  const onSubmit = async (values: CustomerFormValues) => {
    const tags = values.tags
      ? values.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    const payload = {
      nome: values.nome,
      telefone: values.telefone || null,
      email: values.email || null,
      cidade: values.cidade || null,
      estado: values.estado || null,
      tags,
      observacoes: values.observacoes || null,
    };

    if (isEdit && customer) {
      await updateCustomer.mutateAsync({ id: customer.id, patch: payload });
    } else {
      await createCustomer.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar cliente' : 'Novo cliente'}</DialogTitle>
          <DialogDescription className="sr-only">
            {isEdit
              ? 'Edite as informações do cliente selecionado.'
              : 'Preencha os dados para cadastrar um novo cliente.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do cliente ou empresa" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(11) 99999-9999" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="contato@empresa.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade</FormLabel>
                    <FormControl>
                      <Input placeholder="São Paulo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="SP"
                        maxLength={2}
                        className="uppercase"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <Input placeholder="atacado, varejo, parceiro (separadas por vírgula)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Anotações internas sobre este cliente"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-poxpur-green text-white hover:bg-poxpur-green-dark"
              >
                {isPending ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar cliente'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
