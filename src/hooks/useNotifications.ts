import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { PoxpurNotification } from '@/types/database';

// ─── Query Keys ───────────────────────────────────────────────────────────────

const NOTIFICATIONS_KEY = ['notifications'] as const;
const UNREAD_COUNT_KEY = ['notifications', 'unread-count'] as const;

// ─── List notifications ───────────────────────────────────────────────────────

export function useNotifications() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: NOTIFICATIONS_KEY,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId!)
        .order('criado_em', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as PoxpurNotification[];
    },
  });
}

// ─── Unread count ─────────────────────────────────────────────────────────────

export function useUnreadCount() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: UNREAD_COUNT_KEY,
    enabled: !!userId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId!)
        .eq('lida', false);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

// ─── Mark as read ─────────────────────────────────────────────────────────────

export function useMarkAsRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase
        .from('notifications')
        .update({ lida: true, lida_em: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      void qc.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
    },
  });
}

// ─── Mark all as read ─────────────────────────────────────────────────────────

export function useMarkAllAsRead() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Não autenticado');
      const { error } = await supabase
        .from('notifications')
        .update({ lida: true, lida_em: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('lida', false);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      void qc.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
    },
  });
}

// ─── Delete notification ──────────────────────────────────────────────────────

export function useDeleteNotification() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      void qc.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
    },
  });
}

// ─── Realtime subscription ────────────────────────────────────────────────────

export function useNotificationsRealtime() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('poxpur:notifications:user')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'poxpur',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          void qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
          void qc.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
          if (payload.eventType === 'INSERT') {
            const n = payload.new as PoxpurNotification;
            toast(n.titulo, { description: n.mensagem });
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, qc]);
}
