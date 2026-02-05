import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.svg', 'mask-icon.svg'],
      manifest: {
        name: 'Fitness Tracker',
        short_name: 'FitTrack',
        description: 'Track your workouts, nutrition, and fitness goals',
        theme_color: '#646cff',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/fitness-tracker/',
        start_url: '/fitness-tracker/',
        icons: [
          {
            src: 'pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Clean up old caches automatically
        cleanupOutdatedCaches: true,
        // Claim clients immediately when SW becomes active
        clientsClaim: true,
        // Don't intercept Firestore streaming connections
        navigateFallbackDenylist: [/^\/.*\/__\//, /^\/.*\/google\.firestore/],
        runtimeCaching: [
          {
            // Skip Firestore streaming/channel requests entirely - let them pass through
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*\/(Listen|Write)\/channel/i,
            handler: 'NetworkOnly'
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          }
        ]
      }
    })
  ],
  base: '/fitness-tracker/',
})
