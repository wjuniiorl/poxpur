import { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { useConversationsRealtime } from '@/hooks/useMessages';
import { useMarkConversationRead } from '@/hooks/useConversations';
import { ConversationList } from '@/components/chat/ConversationList';
import { ChatThread } from '@/components/chat/ChatThread';
import { CustomerPanel } from '@/components/chat/CustomerPanel';
import { useConversation } from '@/hooks/useConversations';

// ─── Right panel wrapper (needs selected conversation data) ──────────────────

function RightPanel({ conversationId }: { conversationId: string | null }) {
  const { data: conversation } = useConversation(conversationId ?? undefined);

  return <CustomerPanel conversation={conversation} />;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ChatWhatsApp() {
  // Hydrate from URL search param ?c=<id>
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('c');
  });

  const markRead = useMarkConversationRead();

  // Subscribe to realtime updates across the page
  useConversationsRealtime();

  // Update URL when selection changes (without full navigation)
  useEffect(() => {
    const url = new URL(window.location.href);
    if (selectedId) {
      url.searchParams.set('c', selectedId);
    } else {
      url.searchParams.delete('c');
    }
    window.history.replaceState(null, '', url.toString());
  }, [selectedId]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    // Mark as read when selecting
    markRead.mutate({ id });
  };

  return (
    <div className="-m-6 flex h-[calc(100%+3rem)] w-[calc(100%+3rem)] overflow-hidden">
      {/* ── Left: Conversation List ─────────────────────────────────────── */}
      <div className="w-80 shrink-0 h-full overflow-hidden">
        <ConversationList selectedId={selectedId} onSelect={handleSelect} />
      </div>

      {/* ── Center: Chat Thread ─────────────────────────────────────────── */}
      <div className="flex-1 h-full overflow-hidden border-x border-border">
        {selectedId ? (
          <ChatThread conversationId={selectedId} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
              <MessageSquare className="h-8 w-8 opacity-40" />
            </div>
            <div className="text-center">
              <p className="font-medium text-sm">Selecione uma conversa pra começar</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Suas conversas do WhatsApp aparecem à esquerda
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Right: Customer Panel ─────────────────────────────────────────── */}
      <div className="w-72 shrink-0 h-full overflow-hidden border-l border-border">
        <RightPanel conversationId={selectedId} />
      </div>
    </div>
  );
}
