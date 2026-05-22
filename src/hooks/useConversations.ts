import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { mergeAssignees as mergeAssigneesGeneric } from '@/lib/profileMerge';
import { useAuth } from '@/hooks/useAuth';
import type { ConversationWithRelations } from '@/types/database';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ConversationFilters = {
  status?: 'aberta' | 'arquivada' | 'all';
  assignedTo?: string | 'me' | 'unassigned' | 'all';
  search?: string;
  naoLidas?: boolean;
};

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const conversationsKey = (filters?: ConversationFilters) =>
  ['conversations', filters ?? {}] as const;
export const conversationKey = (id: string) => ['conversation', id] as const;

async function mergeAssignees(
  rows: (Omit<ConversationWithRelations, 'assignee'> & { assignee?: unknown })[],
): Promise<ConversationWithRelations[]> {
  const merged = await mergeAssigneesGeneric(rows);
  return merged as unknown as ConversationWithRelations[];
}

// ─── List Conversations ───────────────────────────────────────────────────────

export function useConversations(filters?: ConversationFilters) {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: conversationsKey(filters),
    staleTime: 10_000,
    queryFn: async () => {
      let q = supabase
        .from('conversations')
        .select(
          `*,
          customer:customers(id, nome, telefone, email, cidade, estado, tags, observacoes)`,
        )
        .order('ultima_mensagem_em', { ascending: false, nullsFirst: false });

      // status filter
      if (!filters?.status || filters.status === 'all') {
        // show all statuses
      } else {
        q = q.eq('status', filters.status);
      }

      // assigned_to filter
      if (filters?.assignedTo === 'me' && userId) {
        q = q.eq('assigned_to', userId);
      } else if (filters?.assignedTo === 'unassigned') {
        q = q.is('assigned_to', null);
      } else if (filters?.assignedTo && filters.assignedTo !== 'all') {
        q = q.eq('assigned_to', filters.assignedTo);
      }

      // unread filter
      if (filters?.naoLidas) {
        q = q.gt('nao_lidas', 0);
      }

      const { data, error } = await q;
      if (error) throw error;

      let rows = data as unknown as Omit<ConversationWithRelations, 'assignee'>[];

      // client-side search
      if (filters?.search) {
        const term = filters.search.toLowerCase();
        rows = rows.filter((r) => {
          const nameMatch = (r.customer as { nome?: string } | null)?.nome
            ?.toLowerCase()
            .includes(term);
          const phoneMatch = r.customer_phone?.toLowerCase().includes(term);
          const snapshotMatch = r.customer_nome_snapshot?.toLowerCase().includes(term);
          return nameMatch || phoneMatch || snapshotMatch;
        });
      }

      return mergeAssignees(rows);
    },
  });
}

// ─── Single Conversation ──────────────────────────────────────────────────────

export function useConversation(id: string | undefined) {
  return useQuery({
    queryKey: conversationKey(id ?? ''),
    enabled: !!id,
    staleTime: 5_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select(
          `*,
          customer:customers(id, nome, telefone, email, cidade, estado, tags, observacoes)`,
        )
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const rows = [data as unknown as Omit<ConversationWithRelations, 'assignee'>];
      const merged = await mergeAssignees(rows);
      return merged[0] ?? null;
    },
  });
}

// ─── Assign Conversation ──────────────────────────────────────────────────────

export function useAssignConversation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, sellerId }: { id: string; sellerId: string | null }) => {
      const { error } = await supabase
        .from('conversations')
        .update({ assigned_to: sellerId })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { id }) => {
      void qc.invalidateQueries({ queryKey: ['conversations'] });
      void qc.invalidateQueries({ queryKey: conversationKey(id) });
      toast.success('Conversa atribuída');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao atribuir: ${err.message}`);
    },
  });
}

// ─── Archive / Unarchive ──────────────────────────────────────────────────────

export function useArchiveConversation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase
        .from('conversations')
        .update({ status: 'arquivada' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { id }) => {
      void qc.invalidateQueries({ queryKey: ['conversations'] });
      void qc.invalidateQueries({ queryKey: conversationKey(id) });
      toast.success('Conversa arquivada');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao arquivar: ${err.message}`);
    },
  });
}

export function useUnarchiveConversation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase
        .from('conversations')
        .update({ status: 'aberta' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { id }) => {
      void qc.invalidateQueries({ queryKey: ['conversations'] });
      void qc.invalidateQueries({ queryKey: conversationKey(id) });
      toast.success('Conversa desarquivada');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao desarquivar: ${err.message}`);
    },
  });
}

// ─── Mark Conversation Read ───────────────────────────────────────────────────

// ─── Create Conversation ──────────────────────────────────────────────────────

function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
  return `+${digits}`;
}

export function useCreateConversation() {
  const qc = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (args: {
      customerId?: string | null;
      phone: string;
      nomeSnapshot?: string;
      assignToMe?: boolean;
    }): Promise<{ id: string }> => {
      const phone = normalizePhone(args.phone);
      if (!phone) throw new Error('Telefone inválido');

      // Já existe conversa aberta com esse telefone? Retorna ela.
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('customer_phone', phone)
        .eq('status', 'aberta')
        .order('ultima_mensagem_em', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        toast.info('Já existe uma conversa aberta com esse contato');
        return { id: existing.id };
      }

      // Tenta linkar com customer existente se não veio customerId
      let customerId = args.customerId ?? null;
      let nomeSnapshot = args.nomeSnapshot ?? null;
      if (!customerId) {
        const { data: cust } = await supabase
          .from('customers')
          .select('id, nome')
          .eq('telefone', phone)
          .maybeSingle();
        if (cust) {
          customerId = cust.id;
          nomeSnapshot = nomeSnapshot ?? cust.nome;
        }
      }

      const { data, error } = await supabase
        .from('conversations')
        .insert({
          customer_id: customerId,
          customer_phone: phone,
          customer_nome_snapshot: nomeSnapshot,
          canal: 'whatsapp',
          status: 'aberta',
          assigned_to: args.assignToMe ? (session?.user.id ?? null) : null,
        })
        .select('id')
        .single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (err: Error) => {
      toast.error(`Erro ao criar conversa: ${err.message}`);
    },
  });
}

export function useMarkConversationRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error: messagesError } = await supabase
        .from('messages')
        .update({ lida: true })
        .eq('conversation_id', id)
        .eq('sender_type', 'cliente')
        .eq('lida', false);
      if (messagesError) throw messagesError;

      const { error } = await supabase
        .from('conversations')
        .update({ nao_lidas: 0 })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { id }) => {
      void qc.invalidateQueries({ queryKey: ['conversations'] });
      void qc.invalidateQueries({ queryKey: conversationKey(id) });
    },
    onError: (err: Error) => {
      toast.error(`Erro ao marcar como lida: ${err.message}`);
    },
  });
}
