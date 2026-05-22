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
      registerType: 'autoUpdate',
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
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
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
