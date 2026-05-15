<template>
  <v-expand-transition>
    <v-alert
      v-if="visible"
      type="info"
      variant="tonal"
      class="mb-4 gola-banner"
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
        <span class="text-body-2">{{ $t('home.golaBanner.text') }}</span>
        <v-switch
          v-model="golaSwitch"
          :label="$t('settings.golaLabel')"
          color="primary"
          hide-details
          density="compact"
          class="flex-grow-0 ms-4"
        />
      </div>

      <v-progress-linear
        v-if="isCountingDown"
        class="gola-banner__timer mt-2"
        color="info"
        height="3"
        rounded
        :model-value="100"
        :style="{ '--gola-dismiss-duration': dismissDuration + 'ms' }"
      />
    </v-alert>
  </v-expand-transition>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import { useOptionsStore } from '@/stores/options';
import { trackGolaChoice } from '@/composables/analytics';
import { useGolaNotice } from '@/composables/golaNotice';

const dismissDuration = 2500;

const optionsStore = useOptionsStore();
const { golaNoticeSeen, markGolaNoticeSeen } = useGolaNotice();

const dismissTimer = ref<ReturnType<typeof setTimeout> | null>(null);
const isCountingDown = ref(false);

const visible = computed(() => !golaNoticeSeen.value);

const golaSwitch = computed<boolean>({
  get: () => optionsStore.isInGola,
  set: (value) => {
    optionsStore.changeIsInGola(value);
    trackGolaChoice(value);
    if (!isCountingDown.value) {
      startCountdown();
    }
  },
});

const startCountdown = () => {
  cancelCountdown();
  isCountingDown.value = true;
  dismissTimer.value = setTimeout(() => {
    dismiss();
  }, dismissDuration);
};

const cancelCountdown = () => {
  if (dismissTimer.value) {
    clearTimeout(dismissTimer.value);
    dismissTimer.value = null;
  }
  isCountingDown.value = false;
};

const dismiss = () => {
  cancelCountdown();
  markGolaNoticeSeen();
};

onUnmounted(() => {
  cancelCountdown();
});
</script>

<style scoped>
.gola-banner__timer :deep(.v-progress-linear__determinate) {
  animation: gola-shrink var(--gola-dismiss-duration, 2500ms) linear forwards;
}

@keyframes gola-shrink {
  from { width: 100%; }
  to { width: 0%; }
}
</style>
