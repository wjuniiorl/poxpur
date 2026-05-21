import { useEffect, useRef } from 'react';
import { Users } from 'lucide-react';
import { useChannel, useChannelMessages } from '@/hooks/useTeamChat';
import { InternalMessageBubble } from './InternalMessageBubble';
import { InternalComposer } from './InternalComposer';
import type { InternalMessageWithSender } from '@/hooks/useTeamChat';

// ─── Props ────────────────────────────────────────────────────────────────────

type ChannelThreadProps = {
  channelId: string;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function ChannelThread({ channelId }: ChannelThreadProps) {
  const { data: channel } = useChannel(channelId);
  const { data: messages = [], isLoading } = useChannelMessages(channelId);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages load or new message arrives
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b bg-background shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">
            {channel?.tipo === 'dm' ? channel.nome ?? 'DM' : `# ${channel?.nome ?? '...'}`}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span>canal público</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="px-4 py-4 pb-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              Carregando mensagens...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-center">
              <p className="text-sm font-medium">Nenhuma mensagem ainda</p>
              <p className="text-xs mt-1">Seja o primeiro a escrever em #{channel?.nome}</p>
            </div>
          ) : (
            messages.map((msg: InternalMessageWithSender, i: number) => {
              const prevMsg = i > 0 ? messages[i - 1] : null;
              const isGroupStart = !prevMsg || prevMsg.sender_id !== msg.sender_id;
              return (
                <InternalMessageBubble
                  key={msg.id}
                  message={msg}
                  isGroupStart={isGroupStart}
                />
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Composer */}
      <InternalComposer channelId={channelId} />
    </div>
  );
}
