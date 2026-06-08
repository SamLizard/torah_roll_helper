import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import { useI18n } from 'vue-i18n';
import { createVueI18nAdapter } from 'vuetify/locale/adapters/vue-i18n';
import i18n, { SUPPORTED_LOCALES } from './i18n';
import { getLocaleMeta } from '@/plugins/localeMeta';

const myCustomLightTheme = {
  dark: false,
  colors: {
    primary: '#1976d2',
  },
};

const rtl = Object.fromEntries(
  SUPPORTED_LOCALES.map((locale) => [locale, getLocaleMeta(locale).rtl ?? false]),
) as Record<string, boolean>;

const vuetify = createVuetify({
  locale: {
    rtl,
    adapter: createVueI18nAdapter({ i18n, useI18n }),
  },
  icons: {
    defaultSet: 'mdi',
  },
  theme: {
    defaultTheme: 'myCustomLightTheme',
    themes: {
      myCustomLightTheme,
    },
  },
});

export default vuetify;