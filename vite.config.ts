import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'

// Resolve base path from environment for project-pages deploys.
const basePath = process.env.BASE_PATH || '/'
const manifestStart = basePath === '/' ? './' : basePath
const manifestScope = basePath === '/' ? './' : basePath

// https://vite.dev/config/
export default defineConfig({
  base: basePath,
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '哈基米南北绿豆翻译器',
        short_name: '哈基米翻译器',
        description: '把人类语与哈基米语互相翻译的小工具',
        theme_color: '#ffe0c8b3',
        background_color: '#ffe0c8b3',
        display: 'standalone',
        start_url: manifestStart,
        scope: manifestScope,
        icons: [
          {
            src: './favicon.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: './favicon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable any',
          },
        ],
      },
      // Prevent duplicate precache entries for manifest icons already matched by glob patterns.
      includeManifestIcons: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,jpg,jpeg,webp,png,svg,gif}'],
        // When navigation fails (offline), fall back to the app's index.html
        // Use manifestStart so this works when app is deployed to a subpath.
        navigateFallback: manifestStart + 'index.html',
        runtimeCaching: [
          {
            urlPattern: (
              { request }: { request: { destination?: string } }
            ) => request.destination === 'document',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'hachimi-pages',
            },
          },
          {
            urlPattern: (
              { request }: { request: { destination?: string } }
            ) =>
              request.destination === 'style' ||
              request.destination === 'script',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'hachimi-assets',
            },
          },
        ],
      },
    }),
  ],
  build: {
    // 内联小于 100KB 的资源（HTML、JS、CSS、图片等）
    assetsInlineLimit: 100 * 1024,
    // 不分离 CSS
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        // 内联动态导入
        inlineDynamicImports: true,
      },
    },
    minify: 'terser',
  },
  server: {
    host: '0.0.0.0',
  },
})
