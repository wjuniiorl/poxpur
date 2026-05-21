import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type {
  PoxpurProfile,
  PoxpurTask,
  PoxpurTaskInsert,
  TaskWithRelations,
  TaskStatus,
  TaskPriority,
} from '@/types/database';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TaskFilters = {
  assignedTo?: string | 'me' | 'all';
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority[];
};

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const tasksKey = (filters?: TaskFilters) => ['tasks', filters ?? {}] as const;
export const taskKey = (id: string) => ['task', id] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function mergeProfiles(
  rows: PoxpurTask[],
): Promise<TaskWithRelations[]> {
  const assigneeIds = [...new Set(rows.map((r) => r.assigned_to).filter(Boolean))] as string[];
  const creatorIds = [...new Set(rows.map((r) => r.criado_por).filter(Boolean))] as string[];
  const allIds = [...new Set([...assigneeIds, ...creatorIds])];

  const profilesMap: Record<string, Pick<PoxpurProfile, 'id' | 'nome' | 'role'>> = {};
  if (allIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, nome, role')
      .in('id', allIds);
    for (const p of data ?? []) {
      profilesMap[p.id] = p as Pick<PoxpurProfile, 'id' | 'nome' | 'role'>;
    }
  }

  return rows.map((r) => ({
    ...r,
    assignee: r.assigned_to ? (profilesMap[r.assigned_to] ?? null) : null,
    creator: r.criado_por ? ({ id: profilesMap[r.criado_por]?.id ?? r.criado_por, nome: profilesMap[r.criado_por]?.nome ?? '' } as Pick<PoxpurProfile, 'id' | 'nome'> | null) : null,
  }));
}

// ─── List Tasks ───────────────────────────────────────────────────────────────

export function useTasks(filters?: TaskFilters) {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: tasksKey(filters),
    queryFn: async () => {
      let q = supabase
        .from('tasks')
        .select('*')
        .order('prazo', { ascending: true, nullsFirst: false });

      if (filters?.assignedTo === 'me' && userId) {
        q = q.eq('assigned_to', userId);
      } else if (filters?.assignedTo && filters.assignedTo !== 'all') {
        q = q.eq('assigned_to', filters.assignedTo);
      }

      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          if (filters.status.length > 0) {
            q = q.in('status', filters.status);
          }
        } else {
          q = q.eq('status', filters.status);
        }
      }

      if (filters?.priority && filters.priority.length > 0) {
        q = q.in('prioridade', filters.priority);
      }

      const { data, error } = await q;
      if (error) throw error;

      const rows = (data ?? []) as PoxpurTask[];
      const merged = await mergeProfiles(rows);

      // Sort: urgente first within same day, then by prazo
      const priorityOrder: Record<TaskPriority, number> = {
        urgente: 0,
        alta: 1,
        media: 2,
        baixa: 3,
      };
      const statusOrder: Record<TaskStatus, number> = {
        a_fazer: 0,
        em_andamento: 1,
        concluido: 2,
        cancelado: 3,
      };

      return [...merged].sort((a, b) => {
        const sOrd = statusOrder[a.status] - statusOrder[b.status];
        if (sOrd !== 0) return sOrd;
        // Same status: urgente first, then prazo
        const pOrd = priorityOrder[a.prioridade] - priorityOrder[b.prioridade];
        if (pOrd !== 0) return pOrd;
        if (a.prazo && b.prazo) return a.prazo.localeCompare(b.prazo);
        if (a.prazo) return -1;
        if (b.prazo) return 1;
        return 0;
      });
    },
  });
}

// ─── Single Task ──────────────────────────────────────────────────────────────

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: taskKey(id ?? ''),
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const merged = await mergeProfiles([data as PoxpurTask]);
      return merged[0] ?? null;
    },
  });
}

// ─── Create Task ──────────────────────────────────────────────────────────────

export function useCreateTask() {
  const qc = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (payload: Omit<PoxpurTaskInsert, 'criado_por'>) => {
      const userId = session?.user.id;
      if (!userId) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('tasks')
        .insert({ ...payload, criado_por: userId })
        .select()
        .single();
      if (error) throw error;
      return data as PoxpurTask;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tarefa criada');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao criar tarefa: ${err.message}`);
    },
  });
}

// ─── Update Task ──────────────────────────────────────────────────────────────

export function useUpdateTask() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<PoxpurTaskInsert> }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as PoxpurTask;
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['tasks'] });
      void qc.invalidateQueries({ queryKey: taskKey(data.id) });
      toast.success('Tarefa atualizada');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao atualizar tarefa: ${err.message}`);
    },
  });
}

// ─── Change Task Status ───────────────────────────────────────────────────────

export function useChangeTaskStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as PoxpurTask;
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['tasks'] });
      void qc.invalidateQueries({ queryKey: taskKey(data.id) });
    },
    onError: (err: Error) => {
      toast.error(`Erro ao atualizar status: ${err.message}`);
    },
  });
}

// ─── Delete Task ──────────────────────────────────────────────────────────────

export function useDeleteTask() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tarefa excluída');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao excluir tarefa: ${err.message}`);
    },
  });
}

// ─── Realtime ─────────────────────────────────────────────────────────────────

export function useTasksRealtime() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('poxpur:tasks:realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'poxpur', table: 'tasks' },
        () => {
          void qc.invalidateQueries({ queryKey: ['tasks'] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);
}
