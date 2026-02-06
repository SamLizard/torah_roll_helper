import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue';
import vuetify, {transformAssetUrls} from 'vite-plugin-vuetify'
import vueI18n from '@intlify/unplugin-vue-i18n/vite';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
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
  ],
  base: '/torah_roll_helper/', 
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
})
