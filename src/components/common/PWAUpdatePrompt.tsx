import { useEffect } from 'react';
import { toast } from 'sonner';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(err) {
      console.warn('[PWA] erro registrando SW:', err);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      toast('Nova versão disponível', {
        description: 'Recarregue pra usar a versão mais recente.',
        action: {
          label: 'Recarregar',
          onClick: () => void updateServiceWorker(true),
        },
        duration: Infinity,
        onDismiss: () => setNeedRefresh(false),
      });
    }
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  return null;
}
