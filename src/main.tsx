import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './styles/globals.css';

// Em DEV: desregistra qualquer Service Worker antigo (de build prod anterior) +
// limpa caches workbox. Sem isso, o SW velho intercepta requests do dev server
// e serve assets stale → loop de reload quando rodar `pnpm dev`.
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    if (regs.length > 0) {
      console.info('[dev] desregistrando', regs.length, 'service worker(s) antigo(s)');
      regs.forEach((r) => void r.unregister());
    }
  });
  if ('caches' in window) {
    caches.keys().then((keys) => {
      const swKeys = keys.filter((k) => k.startsWith('workbox-') || k.includes('pages') || k.includes('supabase-rest') || k.includes('fonts'));
      if (swKeys.length > 0) {
        console.info('[dev] limpando', swKeys.length, 'cache(s) do SW');
        swKeys.forEach((k) => void caches.delete(k));
      }
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
