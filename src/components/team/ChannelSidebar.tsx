import { useState } from 'react';
import { Hash, Plus, MessageSquareDashed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useChannels } from '@/hooks/useTeamChat';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { NewChannelDialog } from './NewChannelDialog';
import type { PoxpurInternalChannel } from '@/types/database';

// ─── Props ────────────────────────────────────────────────────────────────────

type ChannelSidebarProps = {
  selectedChannelId: string | undefined;
  onSelectChannel: (id: string) => void;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function ChannelSidebar({ selectedChannelId, onSelectChannel }: ChannelSidebarProps) {
  const { data: channels = [], isLoading } = useChannels();
  const isAdmin = useIsAdmin();
  const [newChannelOpen, setNewChannelOpen] = useState(false);

  const publicChannels = channels.filter((c) => c.tipo === 'publico');

  return (
    <>
      <div className="flex flex-col h-full border-r bg-sidebar w-64 shrink-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b shrink-0">
          <span className="font-semibold text-sm">Equipe</span>
          {isAdmin && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setNewChannelOpen(true)}
              title="Novo canal"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          {/* Public channels section */}
          <p className="px-2 mb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Canais públicos
          </p>

          {isLoading ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">Carregando...</div>
          ) : publicChannels.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum canal ainda</div>
          ) : (
            publicChannels.map((channel: PoxpurInternalChannel) => (
              <button
                key={channel.id}
                onClick={() => onSelectChannel(channel.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left',
                  'transition-colors hover:bg-accent hover:text-accent-foreground',
                  selectedChannelId === channel.id
                    ? 'bg-secondary text-secondary-foreground font-medium'
                    : 'text-foreground/80',
                )}
              >
                <Hash className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{channel.nome ?? 'sem-nome'}</span>
              </button>
            ))
          )}

          {/* DMs section — v2 */}
          <div className="mt-4">
            <p className="px-2 mb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Mensagens diretas
            </p>
            <div className="px-2 py-2 flex items-start gap-2 text-xs text-muted-foreground/70">
              <MessageSquareDashed className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Mensagens diretas em breve</span>
            </div>
          </div>
        </div>
      </div>

      <NewChannelDialog open={newChannelOpen} onOpenChange={setNewChannelOpen} />
    </>
  );
}
