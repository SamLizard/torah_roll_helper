<template>
  <!-- TODO 29: Use localStorage, or make PWA (progressive web app) so the user settings are remembered more long term. -->
  <!-- TODO 30: Add a part to explain how to put on apple screen (like an application). -->
  <v-app>
    <nav-bar />
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import NavBar from './components/NavBar.vue';

import { onMounted, watch } from 'vue';
import { useRtl } from 'vuetify';
import { bootstrapAnalytics } from '@/composables/analytics';

const { isRtl } = useRtl();

watch(isRtl, (newRtl) => {
  document.documentElement.style.setProperty('--swal-direction', newRtl ? 'rtl' : 'ltr');
});

onMounted(() => {
  bootstrapAnalytics();
});
</script>

<style>
#app {
  font-family: Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}

nav a.router-link-exact-active {
  color: #42b983;
}

:root {
  --swal-direction: ltr;
}

.swal2-container {
  direction: var(--swal-direction);
}

.swal2-modal {
  font-family: "roboto", sans-serif;
}

.component {
  background-color: white;
  border-radius: 15px;
  box-shadow: 6px 3px 13px 0px #aaaaaaa1;
}

.fill-height {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
