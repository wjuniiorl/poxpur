import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
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
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useSellers } from '@/hooks/useOrders';
import { useCustomers } from '@/hooks/useCustomers';
import { useOrders } from '@/hooks/useOrders';
import { useCreateTask, useUpdateTask } from '@/hooks/useTasks';
import {
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
} from '@/types/database';
import type { TaskWithRelations, TaskStatus, TaskPriority } from '@/types/database';

// ─── Schema ───────────────────────────────────────────────────────────────────

const taskSchema = z.object({
  titulo: z.string().min(3, 'Título deve ter ao menos 3 caracteres'),
  descricao: z.string().optional().or(z.literal('')),
  status: z.enum(['a_fazer', 'em_andamento', 'concluido', 'cancelado']),
  prioridade: z.enum(['baixa', 'media', 'alta', 'urgente']),
  assigned_to: z.string().optional().or(z.literal('')),
  prazo: z.string().optional().or(z.literal('')),
  vinculo_order_id: z.string().optional().or(z.literal('')),
  vinculo_customer_id: z.string().optional().or(z.literal('')),
});

type TaskFormValues = z.infer<typeof taskSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

type TaskFormModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: TaskWithRelations | null;
  defaultStatus?: TaskStatus;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function TaskFormModal({ open, onOpenChange, task, defaultStatus }: TaskFormModalProps) {
  const isEdit = !!task;
  const { session } = useAuth();
  const isAdmin = useIsAdmin();
  const { data: sellers = [] } = useSellers();
  const { data: customers = [] } = useCustomers();
  const { data: orders = [] } = useOrders();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      titulo: '',
      descricao: '',
      status: defaultStatus ?? 'a_fazer',
      prioridade: 'media',
      assigned_to: '',
      prazo: '',
      vinculo_order_id: '',
      vinculo_customer_id: '',
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (task) {
      form.reset({
        titulo: task.titulo,
        descricao: task.descricao ?? '',
        status: task.status,
        prioridade: task.prioridade,
        assigned_to: task.assigned_to ?? '',
        prazo: task.prazo ? task.prazo.slice(0, 10) : '',
        vinculo_order_id: task.vinculo_order_id ?? '',
        vinculo_customer_id: task.vinculo_customer_id ?? '',
      });
    } else {
      form.reset({
        titulo: '',
        descricao: '',
        status: defaultStatus ?? 'a_fazer',
        prioridade: 'media',
        assigned_to: '',
        prazo: '',
        vinculo_order_id: '',
        vinculo_customer_id: '',
      });
    }
  }, [task, defaultStatus, form, open]);

  const isPending = createTask.isPending || updateTask.isPending;

  const onSubmit = async (values: TaskFormValues) => {
    const payload = {
      titulo: values.titulo,
      descricao: values.descricao || null,
      status: values.status as TaskStatus,
      prioridade: values.prioridade as TaskPriority,
      assigned_to: values.assigned_to || null,
      prazo: values.prazo || null,
      vinculo_order_id: values.vinculo_order_id || null,
      vinculo_customer_id: values.vinculo_customer_id || null,
    };

    if (isEdit && task) {
      await updateTask.mutateAsync({ id: task.id, patch: payload });
    } else {
      await createTask.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  // Sellers + current user
  const assigneeOptions = isAdmin
    ? [
        { id: session?.user.id ?? '', nome: 'Eu (admin)' },
        ...sellers.map((s) => ({ id: s.id, nome: s.nome })),
      ]
    : [{ id: session?.user.id ?? '', nome: 'Eu' }];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar tarefa' : 'Nova tarefa'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={(e) => {
              void form.handleSubmit(onSubmit)(e);
            }}
            className="space-y-4"
          >
            {/* Título */}
            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input placeholder="Descreva a tarefa..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Descrição */}
            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <textarea
                      {...field}
                      value={field.value ?? ''}
                      placeholder="Detalhes opcionais..."
                      rows={3}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              {/* Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        {(Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map((s) => (
                          <option key={s} value={s}>
                            {TASK_STATUS_LABELS[s].label}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Prioridade */}
              <FormField
                control={form.control}
                name="prioridade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        {(Object.keys(TASK_PRIORITY_LABELS) as TaskPriority[]).map((p) => (
                          <option key={p} value={p}>
                            {TASK_PRIORITY_LABELS[p].label}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Responsável */}
              <FormField
                control={form.control}
                name="assigned_to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        value={field.value ?? ''}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="">Nenhum</option>
                        {assigneeOptions.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.nome}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Prazo */}
              <FormField
                control={form.control}
                name="prazo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prazo</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Vínculo pedido */}
              <FormField
                control={form.control}
                name="vinculo_order_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pedido vinculado</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        value={field.value ?? ''}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="">Nenhum</option>
                        {orders.map((o) => (
                          <option key={o.id} value={o.id}>
                            #{o.numero} — {(o as { customer?: { nome?: string } }).customer?.nome ?? ''}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Vínculo cliente */}
              <FormField
                control={form.control}
                name="vinculo_customer_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente vinculado</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        value={field.value ?? ''}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="">Nenhum</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nome}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-poxpur-green hover:bg-poxpur-green-dark text-white"
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? 'Salvar' : 'Criar tarefa'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
