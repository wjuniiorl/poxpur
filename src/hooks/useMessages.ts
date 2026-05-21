import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { whatsapp, simulateIncomingClientMessage } from '@/lib/whatsappAdapter';
import type { PoxpurMessage } from '@/types/database';

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const messagesKey = (conversationId: string) => ['messages', conversationId] as const;

// ─── List Messages ────────────────────────────────────────────────────────────

export function useMessages(conversationId: string | null | undefined) {
  return useQuery({
    queryKey: messagesKey(conversationId ?? ''),
    enabled: !!conversationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId!)
        .order('criado_em', { ascending: true });
      if (error) throw error;
      return data as PoxpurMessage[];
    },
  });
}

// ─── Send Message ─────────────────────────────────────────────────────────────

export type SendMessageInput = {
  conversationId: string;
  to: string;
  text: string;
};

export function useSendMessage() {
  const qc = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (input: SendMessageInput) => {
      const senderId = session?.user.id;
      if (!senderId) throw new Error('Não autenticado');
      return whatsapp.sendText(input, senderId);
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: messagesKey(data.conversation_id) });
      void qc.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (err: Error) => {
      toast.error(`Erro ao enviar mensagem: ${err.message}`);
    },
  });
}

// ─── Simulate Incoming (dev/demo) ─────────────────────────────────────────────

export function useSimulateIncoming() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, text }: { conversationId: string; text: string }) => {
      return simulateIncomingClientMessage(conversationId, text);
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: messagesKey(data.conversation_id) });
      void qc.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (err: Error) => {
      toast.error(`Erro ao simular mensagem: ${err.message}`);
    },
  });
}

// ─── Realtime Subscription ────────────────────────────────────────────────────

export function useConversationsRealtime() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('poxpur:chat:realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'poxpur',
          table: 'messages',
        },
        (payload) => {
          const msg = payload.new as PoxpurMessage;
          void qc.invalidateQueries({ queryKey: messagesKey(msg.conversation_id) });
          void qc.invalidateQueries({ queryKey: ['conversations'] });

          // Show toast for incoming client messages
          if (msg.sender_type === 'cliente') {
            toast('Nova mensagem do cliente', {
              description: msg.conteudo.slice(0, 80),
            });
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'poxpur',
          table: 'conversations',
        },
        () => {
          void qc.invalidateQueries({ queryKey: ['conversations'] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);
}
