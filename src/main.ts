import '@mdi/font/css/materialdesignicons.css';
import './assets/main.css';

import { createApp } from 'vue';
import { createPinia } from 'pinia';

import router from './router/router';
import vuetify from './plugins/vuetify';

import App from './App.vue';
import i18n from './plugins/i18n';

const app = createApp(App)

app.use(vuetify);
app.use(createPinia());
app.use(router);

app.use(i18n);
app.mount('#app');
