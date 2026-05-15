<template>
  <v-dialog v-model="dialog" max-width="520px">
    <v-card class="rounded-xl">
      <v-card-title class="text-h6 font-weight-bold">
        {{ $t('pwa.installGuide.title') }}
      </v-card-title>

      <v-card-text>
        <p class="text-body-2 mb-4">
          {{ $t('pwa.installGuide.subtitle') }}
        </p>

        <div>
          <div class="d-flex align-center mb-2">
            <v-icon class="me-2" color="primary">mdi-apple-safari</v-icon>
            <h3 class="text-subtitle-1 font-weight-bold">
              {{ $t('pwa.installGuide.ios.title') }}
            </h3>
          </div>
          <ol class="install-guide-list">
            <li>{{ $t('pwa.installGuide.ios.step1') }}</li>
            <li>{{ $t('pwa.installGuide.ios.step2') }}</li>
            <li>{{ $t('pwa.installGuide.ios.step3') }}</li>
            <li>{{ $t('pwa.installGuide.ios.step4') }}</li>
          </ol>
        </div>

        <v-divider class="my-4" />

        <div>
          <div class="d-flex align-center mb-2">
            <v-icon class="me-2" color="primary">mdi-android</v-icon>
            <h3 class="text-subtitle-1 font-weight-bold">
              {{ $t('pwa.installGuide.android.title') }}
            </h3>
          </div>
          <ol class="install-guide-list">
            <li>{{ $t('pwa.installGuide.android.step1') }}</li>
            <li>{{ $t('pwa.installGuide.android.step2') }}</li>
            <li>{{ $t('pwa.installGuide.android.step3') }}</li>
            <li>{{ $t('pwa.installGuide.android.step4') }}</li>
          </ol>

          <v-btn
            v-if="canInstall"
            class="mt-3"
            color="primary"
            prepend-icon="mdi-cellphone-arrow-down"
            @click="install"
          >
            {{ $t('pwa.installPrompt.install') }}
          </v-btn>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">
          {{ $t('actions.close') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useInstallPrompt } from '@/composables/installPrompt';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const {
  canInstall,
  installApp,
} = useInstallPrompt();

const dialog = computed<boolean>({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const close = (): void => {
  dialog.value = false;
};

const install = async (): Promise<void> => {
  await installApp();
  close();
};
</script>

<style scoped>
.install-guide-list {
  padding-inline-start: 24px;
}

.install-guide-list li + li {
  margin-top: 6px;
}
</style>
