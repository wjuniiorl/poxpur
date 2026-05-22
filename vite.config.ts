import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const pkg = require('./package.json') as { version: string };

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version ?? '0.8.0'),
  },
  plugins: [
    react(),
    VitePWA({
      // PWA desabilitado temporariamente — kill switch no main.tsx desregistra SW
      // antigos. Sem isso, navegadores com SW envenenado ficam em loop de cache stale.
      // Reativar quando estratégia de cache estiver estável.
      disable: true,
      registerType: 'prompt',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Poxpur Sales Hub',
        short_name: 'Poxpur',
        description: 'Gestão da equipe de vendas Poxpur',
        theme_color: '#1B2C5E',
        background_color: '#FFFFFF',
        display: 'standalone',
        start_url: '/',
        lang: 'pt-BR',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // CRÍTICO: limpa caches antigos a cada novo SW (evita empilhamento)
        cleanupOutdatedCaches: true,
        // Não tomar controle automaticamente — só após o usuário aceitar o update
        skipWaiting: false,
        clientsClaim: false,
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Fallback explícito pra index.html (SPA navigation)
        navigateFallback: 'index.html',
        // Não fallback pra rotas de API/auth/funcs/storage do Supabase
        navigateFallbackDenylist: [/^\/api/, /^\/functions\/v1/, /^\/rest\/v1/, /^\/storage\/v1/, /^\/auth\/v1/, /^\/realtime\/v1/],
        runtimeCaching: [
          {
            urlPattern: /\.woff2$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts',
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /\/rest\/v1\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'supabase-rest', networkTimeoutSeconds: 5 },
          },
          // Index.html SEMPRE network first (evita servir HTML stale com refs a chunks antigos)
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 5 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Permite acessar o dev server via túneis (ngrok, cloudflared, localtunnel)
    // sem precisar editar este arquivo cada vez que a URL muda.
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '.ngrok-free.dev',
      '.ngrok-free.app',
      '.ngrok.io',
      '.ngrok.app',
      '.trycloudflare.com',
      '.loca.lt',
    ],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-') || id.includes('node_modules/victory-')) {
            return 'recharts';
          }
          if (id.includes('node_modules/@supabase/')) {
            return 'supabase';
          }
          if (id.includes('node_modules/@radix-ui/')) {
            return 'radix';
          }
          if (id.includes('node_modules/@tanstack/')) {
            return 'tanstack';
          }
          if (id.includes('node_modules/cmdk')) {
            return 'cmdk';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
