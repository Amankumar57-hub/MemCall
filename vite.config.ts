import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,mp3,webp,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*supabase\.co\/storage\/.*/,
            handler: 'CacheFirst',
            options: { 
              cacheName: 'game-assets', 
              expiration: { maxAgeSeconds: 30 * 24 * 60 * 60 } 
            }
          },
          {
            urlPattern: /^https:\/\/.*supabase\.co\/rest\/.*/,
            handler: 'NetworkFirst',
            options: { 
              cacheName: 'api-cache', 
              networkTimeoutSeconds: 5 
            }
          }
        ]
      },
      manifest: {
        name: 'MemCall',
        short_name: 'MemCall',
        theme_color: '#1B4D3E',
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})
