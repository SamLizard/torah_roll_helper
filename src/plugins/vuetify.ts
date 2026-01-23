import 'vuetify/styles';
import {createVuetify } from 'vuetify';
import { useI18n } from 'vue-i18n';
import { createVueI18nAdapter } from 'vuetify/locale/adapters/vue-i18n';
import i18n from './i18n';

const myCustomLightTheme = {
  dark: false,
  colors: {
    primary: '#1976d2',
  },
}

const vuetify = createVuetify({
  locale: {
    rtl: {
      en: false,
      he: true,
      fr: false
    },
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