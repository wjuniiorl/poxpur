// Helper pra resetar Service Worker + cache (uso de emergência).
// Útil quando o app fica em loop de reload por SW corrompido / cache stale.

export async function resetServiceWorkerAndCaches(): Promise<void> {
  // 1. Desregistrar todos os service workers
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  }

  // 2. Limpar TODOS os caches (workbox, fonts, supabase-rest, pages, etc)
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }

  // 3. Limpar storage (mas preservar a sessão Supabase pra não deslogar)
  // O token fica em `sb-<ref>-auth-token` — preservamos.
  const authKey = Object.keys(localStorage).find((k) => k.startsWith('sb-') && k.endsWith('-auth-token'));
  const authToken = authKey ? localStorage.getItem(authKey) : null;

  // Limpa só nossas chaves de UI store, não toca em sessão
  try {
    localStorage.removeItem('poxpur-ui');
  } catch {
    // ignore
  }

  if (authKey && authToken) {
    localStorage.setItem(authKey, authToken);
  }

  // 4. Reload forçado (sem cache)
  window.location.reload();
}
