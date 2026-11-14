import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // registered safely in src/main.tsx
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'BibleQuest',
        short_name: 'BibleQuest',
        description: 'Explore Scripture. Play the Adventure. Discover the Truth.',
        theme_color: '#142B40',
        background_color: '#0C1B29',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell and small illustrations are available offline; full-size images are cached as viewed.
        globPatterns: ['**/*.{js,css,html,svg,png}', 'images/*-sm.webp'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          { urlPattern: ({ url }) => url.pathname.includes('/images/') && url.pathname.endsWith('.webp'), handler: 'CacheFirst', options: { cacheName: 'bq-images', expiration: { maxEntries: 200 } } },
          { urlPattern: ({ url }) => url.hostname.endsWith('fontshare.com'), handler: 'StaleWhileRevalidate', options: { cacheName: 'bq-fonts', expiration: { maxEntries: 30 } } },
        ],
      },
    }),
  ],
  build: { chunkSizeWarningLimit: 900 },
})
