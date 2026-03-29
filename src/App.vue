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
import Swal from 'sweetalert2';

import { computed, onBeforeUnmount, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useDisplay, useRtl } from 'vuetify';
import {
  bootstrapAnalytics,
  trackTutorialPromptEvent,
} from '@/composables/analytics';
import {
  initializeTutorialState,
  markTutorialPromptSeen,
} from '@/composables/tutorials';

const { isRtl } = useRtl();
const { smAndDown } = useDisplay();
const { t } = useI18n();
const router = useRouter();
const route = useRoute();

let tutorialPromptTimeoutId: number | null = null;

const tutorialPromptPosition = computed(() => {
  if (smAndDown.value) {
    return 'top';
  }

  return isRtl.value ? 'top-start' : 'top-end';
});

watch(isRtl, (newRtl) => {
  document.documentElement.style.setProperty('--swal-direction', newRtl ? 'rtl' : 'ltr');
}, { immediate: true });

const openQuickTutorialFromToast = async () => {
  trackTutorialPromptEvent('opened-quick-tutorial');

  await router.push({
    name: 'home',
    query: {
      tutorial: 'quick',
      source: 'welcome-toast',
    },
  });
};

const showTutorialPrompt = async () => {
  markTutorialPromptSeen();
  trackTutorialPromptEvent('shown');

  const result = await Swal.fire({
    toast: true,
    position: tutorialPromptPosition.value,
    icon: 'info',
    title: t('tutorialPrompt.title'),
    text: t('tutorialPrompt.text'),
    showConfirmButton: true,
    confirmButtonText: t('tutorialPrompt.openQuick'),
    showCloseButton: true,
    timer: 9000,
    timerProgressBar: true,
    customClass: {
      popup: 'tutorial-toast',
    },
  });

  if (result.isConfirmed) {
    await openQuickTutorialFromToast();
  }
};

onMounted(() => {
  bootstrapAnalytics();

  const tutorialInitialization = initializeTutorialState();

  if (
    !tutorialInitialization.isFirstVisit ||
    tutorialInitialization.state.hasSeenHowToPage ||
    tutorialInitialization.state.hasStartedTutorial ||
    route.name === 'howTo'
  ) {
    return;
  }

  tutorialPromptTimeoutId = window.setTimeout(() => {
    if (route.name === 'howTo') {
      return;
    }

    void showTutorialPrompt();
  }, 1300);
});

onBeforeUnmount(() => {
  if (tutorialPromptTimeoutId != null) {
    window.clearTimeout(tutorialPromptTimeoutId);
  }
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

.tutorial-toast {
  width: min(420px, calc(100vw - 24px));
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
