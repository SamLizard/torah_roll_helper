import { createI18n } from 'vue-i18n';
/*
 * All i18n resources specified in the plugin `include` option can be loaded
 * at once using the import syntax
 */
import sourceMessages from '@intlify/unplugin-vue-i18n/messages';
import { he, en, fr } from 'vuetify/locale';
import { defaults, mapValues } from 'lodash';
// Special TODO: Add enviroment varaibles declartion in typescript to be string or undefined

const messages = mapValues({he, en, fr}, (messages, key) => {
  return defaults(sourceMessages?.[key], {$vuetify: messages});
})
const i18n = createI18n({
  legacy: false,
  locale: import.meta.env.VITE_APP_I18N_LOCALE || 'en',
  fallbackLocale: import.meta.env.VITE_APP_I18N_FALLBACK_LOCALE || 'en',
  messages
});


export default i18n;