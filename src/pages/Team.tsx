import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTeamChatRealtime, useChannels } from '@/hooks/useTeamChat';
import { ChannelSidebar } from '@/components/team/ChannelSidebar';
import { ChannelThread } from '@/components/team/ChannelThread';
import { MessageSquare } from 'lucide-react';

// ─── Component ───────────────────────────────────────────────────────────────

export default function Team() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [manualChannelId, setManualChannelId] = useState<string | undefined>(
    searchParams.get('ch') ?? undefined,
  );

  const { data: channels = [] } = useChannels();

  // Derive active channel: manual selection > URL param > first public channel
  const firstPublicId = channels.find((c) => c.tipo === 'publico')?.id ?? channels[0]?.id;
  const selectedChannelId = manualChannelId ?? firstPublicId;

  // Mount realtime subscription at page level
  useTeamChatRealtime(selectedChannelId);

  const handleSelectChannel = (id: string) => {
    setManualChannelId(id);
    setSearchParams({ ch: id }, { replace: true });
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <ChannelSidebar
        selectedChannelId={selectedChannelId}
        onSelectChannel={handleSelectChannel}
      />

      {/* Thread area */}
      {selectedChannelId ? (
        <ChannelThread channelId={selectedChannelId} />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
          <MessageSquare className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">Selecione um canal para começar</p>
        </div>
      )}
    </div>
  );
}
