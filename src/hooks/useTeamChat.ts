import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type {
  PoxpurProfile,
  PoxpurInternalChannel,
  PoxpurInternalChannelInsert,
  PoxpurInternalMessage,
  PoxpurInternalMessageInsert,
} from '@/types/database';

// ─── Extended Types ───────────────────────────────────────────────────────────

export type InternalMessageWithSender = PoxpurInternalMessage & {
  sender: Pick<PoxpurProfile, 'id' | 'nome' | 'role' | 'foto_url'> | null;
};

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const channelsKey = () => ['channels'] as const;
export const channelKey = (id: string) => ['channel', id] as const;
export const internalMessagesKey = (channelId: string) =>
  ['internal-messages', channelId] as const;

// ─── Channels ─────────────────────────────────────────────────────────────────

export function useChannels() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: channelsKey(),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('internal_channels')
        .select('*')
        .order('nome', { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as PoxpurInternalChannel[];
      // publicos first, then DMs
      return rows.sort((a, b) => {
        if (a.tipo === b.tipo) return (a.nome ?? '').localeCompare(b.nome ?? '');
        return a.tipo === 'publico' ? -1 : 1;
      });
    },
  });
}

export function useChannel(id: string | undefined) {
  return useQuery({
    queryKey: channelKey(id ?? ''),
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('internal_channels')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data as PoxpurInternalChannel | null;
    },
  });
}

// ─── Channel Messages ─────────────────────────────────────────────────────────

export function useChannelMessages(channelId: string | undefined) {
  return useQuery({
    queryKey: internalMessagesKey(channelId ?? ''),
    enabled: !!channelId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('internal_messages')
        .select('*')
        .eq('channel_id', channelId!)
        .order('criado_em', { ascending: true });
      if (error) throw error;

      const rows = (data ?? []) as PoxpurInternalMessage[];
      const senderIds = [...new Set(rows.map((r) => r.sender_id).filter(Boolean))] as string[];

      const profilesMap: Record<string, Pick<PoxpurProfile, 'id' | 'nome' | 'role' | 'foto_url'>> =
        {};
      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nome, role, foto_url')
          .in('id', senderIds);
        for (const p of profiles ?? []) {
          profilesMap[p.id] = p as Pick<PoxpurProfile, 'id' | 'nome' | 'role' | 'foto_url'>;
        }
      }

      return rows.map((r) => ({
        ...r,
        sender: r.sender_id ? (profilesMap[r.sender_id] ?? null) : null,
      })) as InternalMessageWithSender[];
    },
  });
}

// ─── Send Internal Message ────────────────────────────────────────────────────

export function useSendInternalMessage() {
  const qc = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async ({
      channelId,
      conteudo,
      mencoes,
    }: {
      channelId: string;
      conteudo: string;
      mencoes?: string[];
    }) => {
      const userId = session?.user.id;
      if (!userId) throw new Error('Não autenticado');

      const payload: PoxpurInternalMessageInsert = {
        channel_id: channelId,
        sender_id: userId,
        conteudo,
        mencoes: mencoes ?? [],
      };

      const { data, error } = await supabase
        .from('internal_messages')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as PoxpurInternalMessage;
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: internalMessagesKey(data.channel_id) });
    },
    onError: (err: Error) => {
      toast.error(`Erro ao enviar mensagem: ${err.message}`);
    },
  });
}

// ─── Create Channel ───────────────────────────────────────────────────────────

export function useCreateChannel() {
  const qc = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async ({ nome }: { nome: string }) => {
      const userId = session?.user.id;
      if (!userId) throw new Error('Não autenticado');

      const payload: PoxpurInternalChannelInsert = {
        nome: nome.toLowerCase().replace(/\s+/g, '-'),
        tipo: 'publico',
        criado_por: userId,
      };

      const { data, error } = await supabase
        .from('internal_channels')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as PoxpurInternalChannel;
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: channelsKey() });
      toast.success(`Canal #${data.nome ?? ''} criado`);
    },
    onError: (err: Error) => {
      toast.error(`Erro ao criar canal: ${err.message}`);
    },
  });
}

// ─── Realtime ─────────────────────────────────────────────────────────────────

export function useTeamChatRealtime(activeChannelId?: string) {
  const qc = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id;

  useEffect(() => {
    const channel = supabase
      .channel('poxpur:team-chat:realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'poxpur', table: 'internal_messages' },
        (payload) => {
          const msg = payload.new as PoxpurInternalMessage;
          void qc.invalidateQueries({ queryKey: internalMessagesKey(msg.channel_id) });

          // Toast if this is not the active channel and not sent by current user
          if (msg.channel_id !== activeChannelId && msg.sender_id !== userId) {
            toast('Nova mensagem no chat interno', {
              description: msg.conteudo.slice(0, 80),
            });
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'poxpur', table: 'internal_channels' },
        () => {
          void qc.invalidateQueries({ queryKey: channelsKey() });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc, activeChannelId, userId]);
}
