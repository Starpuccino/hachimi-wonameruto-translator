import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Resolve base path from environment for project-pages deploys.
const basePath = process.env.BASE_PATH || '/'
const manifestStart = basePath === '/' ? './' : basePath
const manifestScope = basePath === '/' ? './' : basePath

// https://vite.dev/config/
export default defineConfig({
  base: basePath,
  plugins: [
    svelte(),
    viteSingleFile(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['./assets/favicon.png'],
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
            src: './assets/favicon.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: './assets/favicon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'document',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'hachimi-pages',
            },
          },
          {
            urlPattern: ({ request }) =>
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
    // 内联所有 CSS
    cssCodeSplit: false,
    // 内联小于 50KB 的资源（SVG 图片等）
    assetsInlineLimit: 50 * 1024,
    rollupOptions: {
      output: {
        // 内联动态导入
        inlineDynamicImports: true,
        // 不使用 assets 目录
        assetFileNames: 'assets/[name][extname]',
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
      },
    },
    minify: 'terser',
  },
  server: {
    host: '0.0.0.0',
  },
})
