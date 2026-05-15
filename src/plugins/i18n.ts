import { createI18n } from 'vue-i18n';
import sourceMessages from '@intlify/unplugin-vue-i18n/messages';
import { he, en, fr } from 'vuetify/locale';
import { defaults, mapValues } from 'lodash';
import { LANGUAGE_STORAGE_KEY } from '@/composables/storageKeys';

const messages = mapValues({he, en, fr}, (messages, key) => {
  return defaults(sourceMessages?.[key], {$vuetify: messages});
})

const getStoredLocale = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const storedLocale = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);

  if (!storedLocale || !Object.prototype.hasOwnProperty.call(messages, storedLocale)) {
    return null;
  }

  return storedLocale;
};

const i18n = createI18n({
  legacy: false,
  locale: getStoredLocale() || import.meta.env.VITE_APP_I18N_LOCALE || 'en',
  fallbackLocale: import.meta.env.VITE_APP_I18N_FALLBACK_LOCALE || 'en',
  messages
});


export default i18n;
