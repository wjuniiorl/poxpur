import { whatsapp } from '@/lib/whatsappAdapter';
import { useAuth } from './useAuth';

export function useReact() {
  const { session } = useAuth();
  return async (params: {
    conversationId: string;
    to: string;
    whatsappMessageId: string;
    emoji: string;
  }) => {
    if (!session) throw new Error('not authenticated');
    await whatsapp.sendReaction(params, session.user.id);
  };
}

export function useDeleteMessage() {
  const { session } = useAuth();
  return async (params: {
    conversationId: string;
    to: string;
    whatsappMessageId: string;
  }) => {
    if (!session) throw new Error('not authenticated');
    await whatsapp.deleteMessage(params, session.user.id);
  };
}

export function useSendMedia() {
  const { session } = useAuth();
  return {
    sendImage: async (params: {
      conversationId: string;
      to: string;
      mediaUrl: string;
      caption?: string;
      mimetype?: string;
    }) => {
      if (!session) throw new Error('not authenticated');
      return whatsapp.sendImage(params, session.user.id);
    },
    sendAudio: async (params: {
      conversationId: string;
      to: string;
      mediaUrl: string;
      mimetype?: string;
    }) => {
      if (!session) throw new Error('not authenticated');
      return whatsapp.sendAudio(params, session.user.id);
    },
    sendVideo: async (params: {
      conversationId: string;
      to: string;
      mediaUrl: string;
      caption?: string;
      mimetype?: string;
    }) => {
      if (!session) throw new Error('not authenticated');
      return whatsapp.sendVideo(params, session.user.id);
    },
    sendDocument: async (params: {
      conversationId: string;
      to: string;
      mediaUrl: string;
      filename?: string;
      caption?: string;
      mimetype?: string;
    }) => {
      if (!session) throw new Error('not authenticated');
      return whatsapp.sendDocument(params, session.user.id);
    },
  };
}
