import { createI18n } from 'vue-i18n';
import sourceMessages from '@intlify/unplugin-vue-i18n/messages';
import * as vuetifyLocales from 'vuetify/locale';
import { LANGUAGE_STORAGE_KEY } from '@/composables/storageKeys';
import { getLocaleMeta } from '@/plugins/localeMeta';

type AppMessages = Record<string, unknown>;
type VuetifyMessages = Record<string, unknown>;
type VuetifyLocaleModule = Record<string, VuetifyMessages>;

const vuetifyLocaleMessages = vuetifyLocales as unknown as VuetifyLocaleModule;

const messages = Object.fromEntries(
  Object.entries(sourceMessages as Record<string, AppMessages>).map(
    ([locale, appMessages]) => {
      const { vuetifyExportName } = getLocaleMeta(locale);
      const vuetifyMessages =
        vuetifyLocaleMessages[vuetifyExportName ?? locale];

      return [
        locale,
        {
          ...appMessages,
          ...(vuetifyMessages ? { $vuetify: vuetifyMessages } : {}),
        },
      ];
    },
  ),
) as Record<string, unknown>;

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
  messages,
} as any);

const SUPPORTED_LOCALES = Object.keys(messages);

const isSupportedLocale = (locale: unknown): locale is string => {
  return typeof locale === 'string' && Object.prototype.hasOwnProperty.call(messages, locale);
};

const setLocale = (locale: string): void => {
  if (!isSupportedLocale(locale) || (i18n.global.locale as any) === locale) {
    return;
  }

  (i18n.global.locale.value as any) = locale;

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, locale);
  }
};

export { SUPPORTED_LOCALES, isSupportedLocale, setLocale };
export default i18n;