import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { queryClient } from '@/lib/queryClient';
import { AppRoutes } from './routes';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { PWAUpdatePrompt } from '@/components/common/PWAUpdatePrompt';
import { CommandPalette } from '@/components/common/CommandPalette';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <div className="flex h-screen w-screen flex-col">
            <OfflineBanner />
            <div className="min-h-0 flex-1">
              <AppRoutes />
            </div>
          </div>
          <CommandPalette />
          <PWAUpdatePrompt />
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
