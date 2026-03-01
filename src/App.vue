<template>
  <!-- DONE 23: do a real readme.md -->
  <!-- TODO 26: add a matomo? -->
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

import { watch } from 'vue';
import { useRtl } from 'vuetify';
const { isRtl } = useRtl();

watch(isRtl, (newRtl) => {
  document.documentElement.style.setProperty('--swal-direction', newRtl ? 'rtl' : 'ltr');
})
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
