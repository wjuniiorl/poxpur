import { cn } from '@/lib/utils';
import { fmtDate } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { CalendarClock, Link2, User2, ArrowRight } from 'lucide-react';
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '@/types/database';
import type { TaskWithRelations, TaskStatus } from '@/types/database';
import { useChangeTaskStatus } from '@/hooks/useTasks';

// ─── Priority border colors ───────────────────────────────────────────────────

const PRIORITY_BORDER: Record<string, string> = {
  baixa: 'border-l-zinc-300',
  media: 'border-l-blue-400',
  alta: 'border-l-amber-400',
  urgente: 'border-l-rose-500',
};

// ─── Status progression ───────────────────────────────────────────────────────

const NEXT_STATUS: Partial<Record<TaskStatus, TaskStatus>> = {
  a_fazer: 'em_andamento',
  em_andamento: 'concluido',
};

// ─── Props ────────────────────────────────────────────────────────────────────

type TaskCardProps = {
  task: TaskWithRelations;
  onClick: () => void;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function TaskCard({ task, onClick }: TaskCardProps) {
  const changeStatus = useChangeTaskStatus();
  const nextStatus = NEXT_STATUS[task.status];
  const now = new Date();
  const isPastDue = task.prazo ? new Date(task.prazo) < now && task.status !== 'concluido' && task.status !== 'cancelado' : false;
  const priorityInfo = TASK_PRIORITY_LABELS[task.prioridade];

  const handleAdvance = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (nextStatus) {
      changeStatus.mutate({ id: task.id, status: nextStatus });
    }
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative bg-card border border-border border-l-4 rounded-lg p-3 cursor-pointer',
        'hover:shadow-md transition-shadow',
        PRIORITY_BORDER[task.prioridade] ?? 'border-l-zinc-300',
      )}
    >
      {/* Title */}
      <p className="font-semibold text-sm leading-snug line-clamp-2 mb-2 pr-6">{task.titulo}</p>

      {/* Priority badge */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <Badge variant="outline" className={cn('text-[11px] px-1.5 py-0', priorityInfo.color)}>
          {priorityInfo.label}
        </Badge>
        {task.vinculo_order_id && (
          <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
            <Link2 className="h-3 w-3" />
            Pedido
          </span>
        )}
        {task.vinculo_customer_id && (
          <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
            <Link2 className="h-3 w-3" />
            Cliente
          </span>
        )}
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between gap-2">
        {/* Assignee */}
        {task.assignee ? (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground min-w-0">
            <User2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{task.assignee.nome}</span>
          </div>
        ) : (
          <span className="text-[11px] text-muted-foreground/60">Sem responsável</span>
        )}

        {/* Due date */}
        {task.prazo && (
          <div
            className={cn(
              'flex items-center gap-0.5 text-[11px] shrink-0',
              isPastDue ? 'text-rose-600 font-medium' : 'text-muted-foreground',
            )}
          >
            <CalendarClock className="h-3 w-3" />
            {fmtDate.format(new Date(task.prazo))}
          </div>
        )}
      </div>

      {/* Quick-advance arrow (shown on hover) */}
      {nextStatus && (
        <button
          onClick={handleAdvance}
          disabled={changeStatus.isPending}
          title={`Mover para: ${TASK_STATUS_LABELS[nextStatus].label}`}
          className={cn(
            'absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100',
            'transition-opacity text-muted-foreground hover:text-foreground hover:bg-muted',
          )}
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
