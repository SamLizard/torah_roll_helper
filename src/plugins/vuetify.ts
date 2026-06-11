import 'vuetify/styles';
import {createVuetify } from 'vuetify';
import { useI18n } from 'vue-i18n';
import { createVueI18nAdapter } from 'vuetify/locale/adapters/vue-i18n';
import i18n from './i18n';

const myCustomDarkTheme = {
  dark: true,
  colors: {
    background: '#0F172A',
    surface: '#172554',
    primary: '#14B8A6',
    secondary: '#2DD4BF',
    'on-background': '#F8FAFC',
    'on-surface': '#F8FAFC',
    'on-primary': '#0F172A',
    'on-secondary': '#0F172A',
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
    defaultTheme: 'myCustomDarkTheme',
    themes: {
      myCustomDarkTheme,
    },
  },
});

export default vuetify;