import { useEffect, useState } from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type RealtimeStatus = 'connected' | 'reconnecting' | 'offline';

function useRealtimeStatus(): RealtimeStatus {
  const online = useOnlineStatus();
  const [rtStatus, setRtStatus] = useState<'SUBSCRIBED' | 'other'>('other');

  useEffect(() => {
    const channel = supabase.channel('connection-status-probe');
    channel.subscribe((status) => {
      setRtStatus(status === 'SUBSCRIBED' ? 'SUBSCRIBED' : 'other');
    });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  if (!online) return 'offline';
  if (rtStatus === 'SUBSCRIBED') return 'connected';
  return 'reconnecting';
}

const STATUS_CONFIG = {
  connected: {
    dot: 'bg-emerald-500',
    label: 'Online',
    tooltip: 'Conectado ao servidor em tempo real',
    icon: Wifi,
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  reconnecting: {
    dot: 'bg-amber-500',
    label: 'Reconectando...',
    tooltip: 'Tentando reconectar ao servidor',
    icon: Loader2,
    text: 'text-amber-600 dark:text-amber-400',
  },
  offline: {
    dot: 'bg-rose-500',
    label: 'Sem conexão',
    tooltip: 'Sem conexão com a internet',
    icon: WifiOff,
    text: 'text-rose-600 dark:text-rose-400',
  },
} as const;

export function ConnectionStatus() {
  const status = useRealtimeStatus();
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium transition-colors',
              'bg-muted/60 hover:bg-muted',
              config.text,
            )}
          >
            {/* Animated dot */}
            <span className="relative flex h-2 w-2 shrink-0">
              {status === 'connected' && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
              )}
              <span className={cn('relative inline-flex h-2 w-2 rounded-full', config.dot)} />
            </span>

            {/* Label — hidden on small screens */}
            <span className="hidden md:inline-flex items-center gap-1">
              {status === 'reconnecting' && (
                <Icon className="h-3 w-3 animate-spin" />
              )}
              {config.label}
            </span>

            {/* Mobile: just icon */}
            <span className="md:hidden">
              {status === 'reconnecting' ? (
                <Icon className="h-3 w-3 animate-spin" />
              ) : (
                <Icon className="h-3 w-3" />
              )}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">{config.tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
