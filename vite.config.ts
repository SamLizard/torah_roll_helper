import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue';
import vuetify, {transformAssetUrls} from 'vite-plugin-vuetify'
import vueI18n from '@intlify/unplugin-vue-i18n/vite';
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path';

// https://vitejs.dev/config/
const config = defineConfig({
  server: {
    port: 8081,
  },
  plugins: [
    vue({
      template: {
        transformAssetUrls
      }
    }),
    vuetify(),
    vueI18n({
      include: [
        path.resolve(__dirname, './src/locales/**'),
      ],
    }),
    VitePWA({
      registerType: 'prompt',
      manifest: {
        name: 'Torah Roll Helper',
        short_name: 'Torah Roll',
        description: "Free Torah scroll rolling assistant for Gabbaim and Ba'alei Kriah",
        theme_color: '#1976D2',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/torah_roll_helper/',
        start_url: '/torah_roll_helper/',
        categories: ['utilities', 'education'],
        icons: [
          {
            src: 'icon/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icon/pwa-maskable-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icon/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Choose reading',
            short_name: 'Reading',
            description: 'Open the Torah reading selector',
            url: '/torah_roll_helper/#/home',
            icons: [
              {
                src: 'icon/pwa-192x192.png',
                sizes: '192x192',
                type: 'image/png',
              },
            ],
          },
          {
            name: 'How to use',
            short_name: 'How to',
            description: 'Open the usage guide',
            url: '/torah_roll_helper/#/how-to',
            icons: [
              {
                src: 'icon/pwa-192x192.png',
                sizes: '192x192',
                type: 'image/png',
              },
            ],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,ttf,woff,woff2,json,gz,wasm}'],
        globIgnores: [
          '**/materialdesignicons-webfont-*.eot',
          '**/materialdesignicons-webfont-*.ttf',
        ],
        ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^v$/],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
    }),
  ],
  base: '/torah_roll_helper/', 
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
})

export default config
