import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './styles/globals.css';

// ─── Kill switch do Service Worker (SEMPRE, dev + prod) ─────────────────────
// Histórico: o primeiro deploy do Vercel serviu /sw.js com header de cache
// `immutable, max-age=1ano`, então o SW antigo ficou preso no navegador dos
// usuários, servindo HTML cacheado apontando pra chunks que não existem mais
// (404 → loop de carregamento).
//
// Estratégia atual: desativar PWA por enquanto. Força unregister no boot de
// qualquer SW + limpa caches workbox. Trade-off: perde offline support, mas
// elimina classe inteira de bugs de cache stale.
//
// Pra reativar PWA depois (quando estiver tudo estável): remover este bloco
// e reabilitar registro via vite-plugin-pwa.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    if (regs.length > 0) {
      console.info('[pwa-killswitch] desregistrando', regs.length, 'service worker(s)');
      regs.forEach((r) => void r.unregister());
    }
  });
  if ('caches' in window) {
    caches.keys().then((keys) => {
      if (keys.length > 0) {
        console.info('[pwa-killswitch] limpando', keys.length, 'cache(s)');
        keys.forEach((k) => void caches.delete(k));
      }
    });
  }
}

// Detecta erro de chunk lazy (típico após deploy novo com hashes diferentes)
// e força reload limpo. Sem isso, o usuário fica em tela branca.
window.addEventListener('vite:preloadError', () => {
  console.warn('[chunk-recovery] preload error — recarregando');
  window.location.reload();
});

window.addEventListener('error', (ev) => {
  const msg = ev.message ?? '';
  if (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Loading chunk') ||
    msg.includes('Loading CSS chunk')
  ) {
    console.warn('[chunk-recovery] dynamic import falhou — recarregando');
    window.location.reload();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
