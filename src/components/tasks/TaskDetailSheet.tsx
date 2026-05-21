import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Pencil, Trash2, User2, CalendarClock, Link2, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fmtDate, fmtDateTime } from '@/lib/format';
import {
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
} from '@/types/database';
import type { TaskWithRelations, TaskStatus } from '@/types/database';
import { useChangeTaskStatus, useDeleteTask } from '@/hooks/useTasks';
import { TaskFormModal } from './TaskFormModal';

// ─── Status flow ──────────────────────────────────────────────────────────────

const STATUS_FLOW: TaskStatus[] = ['a_fazer', 'em_andamento', 'concluido', 'cancelado'];

// ─── Props ────────────────────────────────────────────────────────────────────

type TaskDetailSheetProps = {
  task: TaskWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateToOrder?: (orderId: string) => void;
  onNavigateToCustomer?: (customerId: string) => void;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function TaskDetailSheet({
  task,
  open,
  onOpenChange,
  onNavigateToOrder,
  onNavigateToCustomer,
}: TaskDetailSheetProps) {
  const [editOpen, setEditOpen] = useState(false);
  const changeStatus = useChangeTaskStatus();
  const deleteTask = useDeleteTask();

  if (!task) return null;

  const now = new Date();
  const isPastDue =
    task.prazo
      ? new Date(task.prazo) < now && task.status !== 'concluido' && task.status !== 'cancelado'
      : false;

  const statusInfo = TASK_STATUS_LABELS[task.status];
  const priorityInfo = TASK_PRIORITY_LABELS[task.prioridade];

  const handleChangeStatus = (status: TaskStatus) => {
    changeStatus.mutate({ id: task.id, status });
  };

  const handleDelete = async () => {
    await deleteTask.mutateAsync({ id: task.id });
    onOpenChange(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-96 overflow-y-auto flex flex-col gap-0 p-0">
          <SheetHeader className="px-5 pt-5 pb-3">
            <div className="flex items-start justify-between gap-2">
              <SheetTitle className="text-base leading-snug pr-2">{task.titulo}</SheetTitle>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setEditOpen(true)}
                  title="Editar"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      title="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. A tarefa será excluída permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive hover:bg-destructive/90"
                        onClick={() => void handleDelete()}
                      >
                        {deleteTask.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Excluir'
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            <SheetDescription className="sr-only">Detalhes da tarefa</SheetDescription>
          </SheetHeader>

          <Separator />

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Status + Priority */}
            <div className="flex flex-wrap gap-2">
              <Badge className={cn('text-xs', statusInfo.color)}>{statusInfo.label}</Badge>
              <Badge variant="outline" className={cn('text-xs', priorityInfo.color)}>
                {priorityInfo.label}
              </Badge>
            </div>

            {/* Description */}
            {task.descricao && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Descrição
                </p>
                <p className="text-sm whitespace-pre-wrap">{task.descricao}</p>
              </div>
            )}

            {/* Meta info */}
            <div className="space-y-2">
              {task.assignee && (
                <div className="flex items-center gap-2 text-sm">
                  <User2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Responsável:</span>
                  <span>{task.assignee.nome}</span>
                </div>
              )}
              {task.prazo && (
                <div
                  className={cn(
                    'flex items-center gap-2 text-sm',
                    isPastDue ? 'text-rose-600' : '',
                  )}
                >
                  <CalendarClock className="h-4 w-4" />
                  <span className="text-muted-foreground">Prazo:</span>
                  <span className={isPastDue ? 'font-medium' : ''}>
                    {fmtDate.format(new Date(task.prazo))}
                    {isPastDue && ' (vencido)'}
                  </span>
                </div>
              )}
              {task.concluido_em && (
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <CalendarClock className="h-4 w-4" />
                  <span>Concluído em {fmtDateTime.format(new Date(task.concluido_em))}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarClock className="h-4 w-4" />
                <span>Criado em {fmtDateTime.format(new Date(task.criado_em))}</span>
              </div>
            </div>

            {/* Links */}
            {(task.vinculo_order_id || task.vinculo_customer_id) && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Vínculos
                  </p>
                  {task.vinculo_order_id && onNavigateToOrder && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start gap-2"
                      onClick={() => {
                        onNavigateToOrder(task.vinculo_order_id!);
                        onOpenChange(false);
                      }}
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      Ver pedido vinculado
                    </Button>
                  )}
                  {task.vinculo_customer_id && onNavigateToCustomer && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start gap-2"
                      onClick={() => {
                        onNavigateToCustomer(task.vinculo_customer_id!);
                        onOpenChange(false);
                      }}
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      Ver cliente vinculado
                    </Button>
                  )}
                </div>
              </>
            )}

            {/* Status change buttons */}
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Alterar status
              </p>
              <div className="flex flex-wrap gap-2">
                {STATUS_FLOW.filter((s) => s !== task.status).map((s) => (
                  <Button
                    key={s}
                    variant="outline"
                    size="sm"
                    disabled={changeStatus.isPending}
                    onClick={() => handleChangeStatus(s)}
                    className="gap-1.5 text-xs"
                  >
                    <ArrowRight className="h-3 w-3" />
                    {TASK_STATUS_LABELS[s].label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit modal */}
      <TaskFormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        task={task}
      />
    </>
  );
}
