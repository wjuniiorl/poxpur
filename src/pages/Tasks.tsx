import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, LayoutGrid, List, Search, ChevronUp, ChevronDown, ChevronsUpDown, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { fmtDate } from '@/lib/format';
import { useTasks, useTasksRealtime } from '@/hooks/useTasks';
import { useSellers } from '@/hooks/useOrders';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import {
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
} from '@/types/database';
import type { TaskWithRelations, TaskStatus, TaskPriority } from '@/types/database';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskFormModal } from '@/components/tasks/TaskFormModal';
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet';

// ─── Constants ────────────────────────────────────────────────────────────────

const KANBAN_STATUSES: TaskStatus[] = ['a_fazer', 'em_andamento', 'concluido', 'cancelado'];
const ALL_PRIORITIES: TaskPriority[] = ['urgente', 'alta', 'media', 'baixa'];
const ALL_STATUSES: TaskStatus[] = ['a_fazer', 'em_andamento', 'concluido', 'cancelado'];

// ─── Column header colors ─────────────────────────────────────────────────────

const COLUMN_COLORS: Record<TaskStatus, string> = {
  a_fazer: 'border-t-zinc-400',
  em_andamento: 'border-t-blue-500',
  concluido: 'border-t-emerald-500',
  cancelado: 'border-t-rose-400',
};

// ─── Priority border for table rows ──────────────────────────────────────────

const PRIORITY_DOT: Record<TaskPriority, string> = {
  baixa: 'bg-zinc-400',
  media: 'bg-blue-500',
  alta: 'bg-amber-500',
  urgente: 'bg-rose-500',
};

// ─── Sort types ───────────────────────────────────────────────────────────────

type SortKey = 'titulo' | 'status' | 'prioridade' | 'assignee' | 'prazo' | 'criado_em';
type SortDir = 'asc' | 'desc';

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function KanbanSkeleton() {
  return (
    <div className="flex gap-4 h-full">
      {KANBAN_STATUSES.map((s) => (
        <div key={s} className="flex-1 min-w-[220px] space-y-2">
          <Skeleton className="h-8 w-full rounded-lg" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Tasks() {
  const isAdmin = useIsAdmin();
  const { data: sellers = [] } = useSellers();
  const [params, setParams] = useSearchParams();
  const newRequested = params.get('new') === '1';
  const cleanedRef = useRef(false);

  // View state
  const [view, setView] = useState<'kanban' | 'lista'>('kanban');
  const [formOpen, setFormOpen] = useState(newRequested);
  const [formDefaultStatus, setFormDefaultStatus] = useState<TaskStatus>('a_fazer');
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

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

  // Filter state
  const [search, setSearch] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority[]>([]);
  const [statusFilter, setStatusFilter] = useState<TaskStatus[]>([]);

  // Sort state (lista view)
  const [sortKey, setSortKey] = useState<SortKey>('criado_em');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Mount realtime subscription
  useTasksRealtime();

  // Build query filters
  const queryFilters = useMemo(() => ({
    assignedTo:
      assigneeFilter === 'me'
        ? ('me' as const)
        : assigneeFilter === 'all'
          ? ('all' as const)
          : assigneeFilter,
    priority: priorityFilter.length > 0 ? priorityFilter : undefined,
  }), [assigneeFilter, priorityFilter]);

  const { data: allTasks = [], isLoading } = useTasks(queryFilters);

  // Client-side search + status filter (for list view)
  const filteredTasks = useMemo(() => {
    let tasks = allTasks;
    if (search.trim()) {
      const term = search.toLowerCase();
      tasks = tasks.filter((t) => t.titulo.toLowerCase().includes(term));
    }
    if (view === 'lista' && statusFilter.length > 0) {
      tasks = tasks.filter((t) => statusFilter.includes(t.status));
    }
    return tasks;
  }, [allTasks, search, statusFilter, view]);

  // Sorted tasks for lista view
  const sortedTasks = useMemo(() => {
    if (view !== 'lista') return filteredTasks;
    return [...filteredTasks].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'titulo':
          cmp = a.titulo.localeCompare(b.titulo);
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
        case 'prioridade': {
          const order = { urgente: 0, alta: 1, media: 2, baixa: 3 };
          cmp = order[a.prioridade] - order[b.prioridade];
          break;
        }
        case 'assignee':
          cmp = (a.assignee?.nome ?? '').localeCompare(b.assignee?.nome ?? '');
          break;
        case 'prazo':
          if (a.prazo && b.prazo) cmp = a.prazo.localeCompare(b.prazo);
          else if (a.prazo) cmp = -1;
          else if (b.prazo) cmp = 1;
          break;
        case 'criado_em':
          cmp = a.criado_em.localeCompare(b.criado_em);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredTasks, sortKey, sortDir, view]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const openDetail = (task: TaskWithRelations) => {
    setSelectedTask(task);
    setDetailOpen(true);
  };

  const openNewTask = (status: TaskStatus = 'a_fazer') => {
    setFormDefaultStatus(status);
    setFormOpen(true);
  };

  const togglePriority = (p: TaskPriority) => {
    setPriorityFilter((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  const toggleStatus = (s: TaskStatus) => {
    setStatusFilter((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />;
    return sortDir === 'asc' ? (
      <ChevronUp className="h-3.5 w-3.5" />
    ) : (
      <ChevronDown className="h-3.5 w-3.5" />
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 px-6 py-3 border-b bg-background shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">Tarefas</h1>
          <Badge variant="secondary" className="text-xs">
            {allTasks.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center border rounded-lg overflow-hidden">
            <button
              onClick={() => setView('kanban')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors',
                view === 'kanban'
                  ? 'bg-secondary text-secondary-foreground font-medium'
                  : 'hover:bg-muted text-muted-foreground',
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Kanban
            </button>
            <button
              onClick={() => setView('lista')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors border-l',
                view === 'lista'
                  ? 'bg-secondary text-secondary-foreground font-medium'
                  : 'hover:bg-muted text-muted-foreground',
              )}
            >
              <List className="h-3.5 w-3.5" />
              Lista
            </button>
          </div>

          <Button
            size="sm"
            onClick={() => openNewTask()}
            className="bg-poxpur-green hover:bg-poxpur-green-dark text-white gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Nova tarefa
          </Button>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2 px-6 py-2 border-b bg-background shrink-0">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar tarefa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 w-48 text-sm"
          />
        </div>

        {/* Assignee */}
        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          className="flex h-8 w-36 rounded-md border border-input bg-background px-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="all">Todas</option>
          <option value="me">Minhas</option>
          {isAdmin &&
            sellers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
        </select>

        {/* Priority chips */}
        <div className="flex items-center gap-1">
          {ALL_PRIORITIES.map((p) => {
            const info = TASK_PRIORITY_LABELS[p];
            return (
              <button
                key={p}
                onClick={() => togglePriority(p)}
                className={cn(
                  'text-[11px] px-2 py-1 rounded-full border transition-colors',
                  priorityFilter.includes(p)
                    ? `${info.color} border-transparent`
                    : 'border-border text-muted-foreground hover:bg-muted',
                )}
              >
                {info.label}
              </button>
            );
          })}
        </div>

        {/* Status chips (lista only) */}
        {view === 'lista' && (
          <div className="flex items-center gap-1">
            {ALL_STATUSES.map((s) => {
              const info = TASK_STATUS_LABELS[s];
              return (
                <button
                  key={s}
                  onClick={() => toggleStatus(s)}
                  className={cn(
                    'text-[11px] px-2 py-1 rounded-full border transition-colors',
                    statusFilter.includes(s)
                      ? `${info.color} border-transparent`
                      : 'border-border text-muted-foreground hover:bg-muted',
                  )}
                >
                  {info.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto px-6 py-4">
        {isLoading ? (
          <KanbanSkeleton />
        ) : view === 'kanban' ? (
          /* ── Kanban ── */
          <div className="flex gap-4 h-full min-h-0">
            {KANBAN_STATUSES.map((status) => {
              const col = filteredTasks.filter((t) => t.status === status);
              const info = TASK_STATUS_LABELS[status];
              return (
                <div
                  key={status}
                  className={cn(
                    'flex flex-col flex-1 min-w-[220px] max-w-xs rounded-lg border border-t-2 bg-muted/30 overflow-hidden',
                    COLUMN_COLORS[status],
                  )}
                >
                  {/* Column header */}
                  <div className="flex items-center justify-between px-3 py-2 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{info.label}</span>
                      <Badge variant="secondary" className="text-xs px-1.5 py-0">
                        {col.length}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => openNewTask(status)}
                      title={`Nova tarefa em ${info.label}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
                    {col.length === 0 ? (
                      <div className="text-xs text-muted-foreground/50 text-center py-6">
                        Sem tarefas
                      </div>
                    ) : (
                      col.map((task) => (
                        <TaskCard key={task.id} task={task} onClick={() => openDetail(task)} />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Lista ── */
          sortedTasks.length === 0 ? (
            <div className="grid h-full min-h-64 place-items-center">
              <div className="max-w-sm space-y-3 text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-poxpur-green/10">
                  <ClipboardList className="h-8 w-8 text-poxpur-green" />
                </div>
                <h3 className="font-semibold text-poxpur-navy">
                  {search || statusFilter.length > 0 || priorityFilter.length > 0
                    ? 'Nenhuma tarefa com esses filtros'
                    : 'Comece criando sua primeira tarefa'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {search || statusFilter.length > 0 || priorityFilter.length > 0
                    ? 'Tente ajustar os filtros ou a busca.'
                    : 'Organize o trabalho da equipe com tarefas, prioridades e prazos.'}
                </p>
                {!search && statusFilter.length === 0 && priorityFilter.length === 0 && (
                  <Button
                    size="sm"
                    className="bg-poxpur-green hover:bg-poxpur-green-dark text-white gap-1.5"
                    onClick={() => openNewTask()}
                  >
                    <Plus className="h-4 w-4" />
                    Nova tarefa
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden bg-background">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    {(
                      [
                        { key: 'titulo', label: 'Título' },
                        { key: 'status', label: 'Status' },
                        { key: 'prioridade', label: 'Prioridade' },
                        { key: 'assignee', label: 'Responsável' },
                        { key: 'prazo', label: 'Prazo' },
                        { key: 'criado_em', label: 'Criado' },
                      ] as { key: SortKey; label: string }[]
                    ).map(({ key, label }) => (
                      <th
                        key={key}
                        className="px-4 py-3 text-left text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none"
                        onClick={() => handleSort(key)}
                      >
                        <span className="flex items-center gap-1">
                          {label}
                          <SortIcon col={key} />
                        </span>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-right">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTasks.map((task) => {
                    const now = new Date();
                    const isPastDue =
                      task.prazo
                        ? new Date(task.prazo) < now &&
                          task.status !== 'concluido' &&
                          task.status !== 'cancelado'
                        : false;
                    const statusInfo = TASK_STATUS_LABELS[task.status];
                    const priorityInfo = TASK_PRIORITY_LABELS[task.prioridade];
                    return (
                      <tr
                        key={task.id}
                        className="border-b cursor-pointer hover:bg-muted/40 transition-colors"
                        onClick={() => openDetail(task)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'h-2 w-2 rounded-full shrink-0',
                                PRIORITY_DOT[task.prioridade],
                              )}
                            />
                            <span className="font-medium line-clamp-1">{task.titulo}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={cn('text-xs', statusInfo.color)}>
                            {statusInfo.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={cn('text-xs', priorityInfo.color)}
                          >
                            {priorityInfo.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {task.assignee?.nome ?? '—'}
                        </td>
                        <td
                          className={cn(
                            'px-4 py-3 text-xs',
                            isPastDue ? 'text-rose-600 font-medium' : 'text-muted-foreground',
                          )}
                        >
                          {task.prazo ? fmtDate.format(new Date(task.prazo)) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {fmtDate.format(new Date(task.criado_em))}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => openDetail(task)}
                          >
                            Ver
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Modals */}
      <TaskFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        defaultStatus={formDefaultStatus}
      />
      <TaskDetailSheet
        task={selectedTask}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
