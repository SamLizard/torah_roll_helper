<template>
  <v-snackbar
    v-model="showOfflineReady"
    :timeout="3000"
    color="success"
    location="bottom"
  >
    {{ $t('pwa.reloadPrompt.offlineReady') }}
    <template #actions>
      <v-btn
        variant="text"
        @click="close"
      >
        {{ $t('pwa.reloadPrompt.close') }}
      </v-btn>
    </template>
  </v-snackbar>

  <v-snackbar
    v-model="needRefresh"
    :timeout="-1"
    color="primary"
    location="bottom"
  >
    {{ $t('pwa.reloadPrompt.needRefresh') }}
    <template #actions>
      <v-btn
        variant="text"
        @click="updateServiceWorker(true)"
      >
        {{ $t('pwa.reloadPrompt.update') }}
      </v-btn>
      <v-btn
        variant="text"
        @click="close"
      >
        {{ $t('pwa.reloadPrompt.dismiss') }}
      </v-btn>
    </template>
  </v-snackbar>
</template>

<script setup lang="ts">
import { computed, onUnmounted } from 'vue';
import { useRegisterSW } from 'virtual:pwa-register/vue';

const serviceWorkerUpdateIntervalMs = 60 * 60 * 1000;
let serviceWorkerUpdateIntervalId: number | null = null;

const { offlineReady, needRefresh, updateServiceWorker } = useRegisterSW({
  onRegistered(registration) {
    if (!registration || serviceWorkerUpdateIntervalId !== null) {
      return;
    }

    serviceWorkerUpdateIntervalId = window.setInterval(() => {
      void registration.update();
    }, serviceWorkerUpdateIntervalMs);
  },
});

const showOfflineReady = computed({
  get: () => offlineReady.value && !needRefresh.value,
  set: (value: boolean) => {
    if (!value) {
      offlineReady.value = false;
    }
  },
});

const close = () => {
  offlineReady.value = false;
  needRefresh.value = false;
};

onUnmounted(() => {
  if (serviceWorkerUpdateIntervalId !== null) {
    window.clearInterval(serviceWorkerUpdateIntervalId);
  }
});
</script>
