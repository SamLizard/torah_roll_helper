<template>
  <v-dialog v-model="dialog" max-width="500px">
    <v-card class="rounded-xl" data-tutorial="settings-dialog">
      <v-card-title class="text-h6 font-weight-bold">
        {{ $t('settings.label') }}
      </v-card-title>

      <v-card-text class="pt-2">
        <div class="setting-control setting-switch" data-tutorial="settings-gola">
          <v-switch
            v-model="isInGola"
            :label="$t('settings.golaLabel')"
            color="primary"
            hide-details
            class="flex-grow-1"
          />
          <v-tooltip location="top" :text="$t('settings.help.gola')">
            <template #activator="{ props: tooltipProps }">
              <v-btn
                v-bind="tooltipProps"
                icon="mdi-information-outline"
                variant="text"
                size="small"
                class="info-btn"
              />
            </template>
          </v-tooltip>
        </div>

        <div class="setting-control" data-tutorial="settings-nusach">
          <v-select
            v-model="nusach"
            :items="nusachOptions"
            item-title="title"
            item-value="value"
            :label="$t('settings.nusachLabel')"
            variant="outlined"
            density="comfortable"
            hide-details="auto"
            class="flex-grow-1"
          />
          <v-tooltip location="top" :text="$t('settings.help.nusach')">
            <template #activator="{ props: tooltipProps }">
              <v-btn
                v-bind="tooltipProps"
                icon="mdi-information-outline"
                variant="text"
                size="small"
                class="info-btn"
              />
            </template>
          </v-tooltip>
        </div>

        <div class="setting-control" data-tutorial="settings-torah-type">
          <v-select
            v-model="torahType"
            :items="torahTypeOptions"
            item-title="title"
            item-value="value"
            :label="$t('settings.torahTypeLabel')"
            variant="outlined"
            density="comfortable"
            hide-details="auto"
            class="flex-grow-1"
          />
          <v-tooltip location="top" :text="$t('settings.help.torahType')">
            <template #activator="{ props: tooltipProps }">
              <v-btn
                v-bind="tooltipProps"
                icon="mdi-information-outline"
                variant="text"
                size="small"
                class="info-btn"
              />
            </template>
          </v-tooltip>
        </div>

        <template v-if="showInstallGuideEntry">
          <v-divider class="my-4" />
          <v-btn
            block
            color="primary"
            prepend-icon="mdi-cellphone-arrow-down"
            variant="tonal"
            @click="openInstallGuide"
          >
            {{ $t('pwa.installGuide.open') }}
          </v-btn>
        </template>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" data-tutorial="settings-close" @click="close">
          {{ $t('actions.close') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <install-guide-dialog v-model="installGuideDialog" />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDisplay } from 'vuetify';
import { trackGolaChoice } from '@/composables/analytics';
import { markGolaNoticeSeen } from '@/composables/golaNotice';
import { useInstallPrompt } from '@/composables/installPrompt';
import InstallGuideDialog from '@/components/InstallGuideDialog.vue';
import {
  NUSACH_OPTIONS,
  TORAH_TYPE_OPTIONS,
  type NusachOption,
  type TorahTypeOption,
  useOptionsStore,
} from '@/stores/options';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const { t } = useI18n();
const { smAndDown } = useDisplay();
const {
  isStandalone,
} = useInstallPrompt();
const optionsStore = useOptionsStore();
const installGuideDialog = ref(false);

const dialog = computed<boolean>({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const isInGola = computed<boolean>({
  get: () => optionsStore.isInGola,
  set: (value) => {
    optionsStore.changeIsInGola(value);
    markGolaNoticeSeen();
    trackGolaChoice(value);
  },
});

const nusach = computed<NusachOption>({
  get: () => optionsStore.nusach,
  set: (value) => optionsStore.changeNusach(value),
});

const torahType = computed<TorahTypeOption>({
  get: () => optionsStore.torahType,
  set: (value) => optionsStore.changeTorahType(value),
});

const nusachOptions = computed(() => {
  return NUSACH_OPTIONS.map((value) => ({
    title: t(`settings.nusachOptions.${value}`),
    value,
  }));
});

const torahTypeOptions = computed(() => {
  return TORAH_TYPE_OPTIONS.map((option) => ({
    title: t(`settings.torahTypeOptions.${option.id}`, { pages: option.pageCount }),
    value: option.id,
  }));
});

const showInstallGuideEntry = computed(() => smAndDown.value && !isStandalone.value);

const close = (): void => {
  dialog.value = false;
};

const openInstallGuide = (): void => {
  installGuideDialog.value = true;
};
</script>

<style scoped>
.setting-control {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  margin-bottom: 8px;
}

.setting-switch {
  align-items: center;
}

.info-btn {
  margin-top: 10px;
}
</style>
