import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-poxpur-red px-4 py-1.5 text-center text-xs text-white">
      <WifiOff className="h-3.5 w-3.5" />
      Você está offline. Algumas ações podem não funcionar até a conexão voltar.
    </div>
  );
}
