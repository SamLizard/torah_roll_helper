import '@mdi/font/css/materialdesignicons.css';
import './assets/main.css';

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';

import router from './router/router';
import vuetify from './plugins/vuetify';

import App from './App.vue';
import i18n from './plugins/i18n';

const app = createApp(App)
const pinia = createPinia();

pinia.use(piniaPluginPersistedstate);

app.use(vuetify);
app.use(pinia);
app.use(router);

app.use(i18n);
app.mount('#app');
