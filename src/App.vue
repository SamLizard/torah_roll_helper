<template>
  <!-- DONE 23: do a real readme.md -->
  <!-- DONE 26: add a matomo? Use goatcounter. I would like to have stats on the buttons (actions) used in the FROM and TO, 
   How much the language is changed (to which language), 
   how much each other view than home is used, 
   how much the preview button is used (and how much time link to tikkun.io opened). 
   How much different roll results are displayed. 
   How much the calendar is used (but I want to be able to make difference between FROM calendar and TO calendar), and how much days ago/next they choose. 
   How much the parasha reference point is changed (FROM / TO separate in stats). -->
  <!-- DONE 28: update the readme to explain how someone can help developping the project. Add that codex (chatgpt) helped in an important part of the project, and the code may be less clean. -->
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
