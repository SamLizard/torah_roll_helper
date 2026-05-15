<template>
  <v-expand-transition>
    <v-alert
      v-if="visible"
      type="info"
      variant="tonal"
      class="mb-4"
    >
      <template #close>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          density="compact"
          :aria-label="$t('actions.close')"
          @click="dismiss"
        />
      </template>

      <div class="d-flex align-center flex-wrap ga-2">
        <v-icon size="18">mdi-content-save-check-outline</v-icon>
        <span class="text-body-2">
          {{ bannerText }}
        </span>
      </div>

      <v-progress-linear
        class="saved-settings-banner__timer mt-2"
        color="info"
        height="3"
        rounded
        :model-value="100"
        :style="{ '--saved-settings-dismiss-duration': dismissDuration + 'ms' }"
      />
    </v-alert>
  </v-expand-transition>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useInstallPrompt } from '@/composables/installPrompt';
import { OPTIONS_STORAGE_KEY } from '@/composables/storageKeys';
import { useOptionsStore } from '@/stores/options';

const dismissDuration = 5000;

const { t } = useI18n();
const optionsStore = useOptionsStore();
const { initializeInstallPrompt, isStandalone } = useInstallPrompt();

const noticeDismissed = ref(false);
const hasSavedOptions = ref(false);
const dismissTimer = ref<ReturnType<typeof setTimeout> | null>(null);

const getTranslatedText = (key: string): string => {
  const translatedValue = t(key);

  return typeof translatedValue === 'string' ? translatedValue : '';
};

const savedSettingLabels = computed(() => {
  const labels: string[] = [];

  if (optionsStore.isInGola) {
    labels.push(t('settings.savedSettingsBanner.gola'));
  }

  if (optionsStore.nusach !== 'sefaradic') {
    labels.push(t('settings.savedSettingsBanner.nusach', {
      value: getTranslatedText(`settings.nusachOptions.${optionsStore.nusach}`),
    }));
  }

  if (optionsStore.torahType !== 'klaf_245') {
    labels.push(t('settings.savedSettingsBanner.torahType', {
      value: getTranslatedText(`settings.torahTypeOptions.${optionsStore.torahType}`),
    }));
  }

  return labels;
});

const savedSettingsLabel = computed(() => savedSettingLabels.value.join(', '));

const bannerText = computed(() => {
  if (!savedSettingsLabel.value) {
    return t('settings.savedSettingsBanner.defaultText');
  }

  return t('settings.savedSettingsBanner.text', { settings: savedSettingsLabel.value });
});

const visible = computed(() => {
  return !noticeDismissed.value && !isStandalone.value && hasSavedOptions.value;
});

const cancelDismissTimer = () => {
  if (dismissTimer.value) {
    clearTimeout(dismissTimer.value);
    dismissTimer.value = null;
  }
};

const startDismissTimer = () => {
  cancelDismissTimer();
  dismissTimer.value = setTimeout(() => {
    dismiss();
  }, dismissDuration);
};

const dismiss = () => {
  cancelDismissTimer();
  noticeDismissed.value = true;
};

onMounted(() => {
  initializeInstallPrompt();
  hasSavedOptions.value = typeof window !== 'undefined'
    && window.localStorage.getItem(OPTIONS_STORAGE_KEY) !== null;
});

watch(visible, (isVisible) => {
  if (isVisible) {
    startDismissTimer();
    return;
  }

  cancelDismissTimer();
}, { immediate: true });

onUnmounted(() => {
  cancelDismissTimer();
});

watch(
  () => [optionsStore.isInGola, optionsStore.nusach, optionsStore.torahType],
  () => {
    if (!isStandalone.value) {
      hasSavedOptions.value = true;
    }
  },
);
</script>

<style scoped>
.saved-settings-banner__timer :deep(.v-progress-linear__determinate) {
  animation: saved-settings-shrink var(--saved-settings-dismiss-duration, 5000ms) linear forwards;
}

@keyframes saved-settings-shrink {
  from { width: 100%; }
  to { width: 0%; }
}
</style>
