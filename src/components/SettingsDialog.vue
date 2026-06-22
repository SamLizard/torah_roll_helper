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
            class="grow"
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
            class="grow"
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
            class="grow"
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

        <div class="setting-control" data-tutorial="settings-tikkun-provider">
          <v-select
            v-model="tikkunProvider"
            :items="tikkunProviderOptions"
            item-title="title"
            item-value="value"
            :label="$t('settings.tikkunProviderLabel')"
            variant="outlined"
            density="comfortable"
            hide-details="auto"
            class="grow"
          >
            <template #item="{ props: itemProps, item }">
              <v-list-item
                v-bind="itemProps"
                :prepend-avatar="item.raw.faviconUrl ?? undefined"
                :title="item.raw.title"
                :subtitle="item.raw.description"
              />
            </template>
            <template #selection="{ item }">
              <div class="provider-selection">
                <v-avatar v-if="item.raw.faviconUrl" size="20" rounded="0">
                  <v-img :src="item.raw.faviconUrl" :alt="item.raw.title" />
                </v-avatar>
                <span>{{ item.raw.title }}</span>
              </div>
            </template>
          </v-select>
          <v-tooltip location="top" :text="$t('settings.help.tikkunProvider')">
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

        <v-divider class="my-4" />

        <section class="storage-protection" data-tutorial="settings-storage-protection">
          <div class="storage-protection__header">
            <div>
              <div class="text-subtitle-2 font-weight-medium">{{ $t('settings.storageProtection.label') }}</div>
              <div class="text-caption text-medium-emphasis">{{ storageProtectionHelp }}</div>
            </div>
            <v-chip
              size="small"
              :color="storageProtectionColor"
              variant="tonal"
            >
              {{ storageProtectionStatusLabel }}
            </v-chip>
          </div>

          <div class="storage-protection__actions mt-2">
            <v-btn
              v-if="isStorageProtectionSupported && !isStorageProtectionPersisted"
              size="small"
              color="primary"
              variant="tonal"
              prepend-icon="mdi-shield-check-outline"
              :loading="isStorageProtectionChecking"
              @click="requestStorageProtection"
            >
              {{ $t('settings.storageProtection.request') }}
            </v-btn>
            <v-btn
              v-if="!isStandalone && !showInstallGuideEntry"
              size="small"
              variant="text"
              prepend-icon="mdi-cellphone-arrow-down"
              @click="openInstallGuide"
            >
              {{ $t('pwa.installGuide.open') }}
            </v-btn>
          </div>
        </section>

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
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDisplay } from 'vuetify';
import { trackGolaChoice } from '@/composables/analytics';
import { markGolaNoticeSeen } from '@/composables/golaNotice';
import { useInstallPrompt } from '@/composables/installPrompt';
import { usePersistentStorage } from '@/composables/persistentStorage';
import InstallGuideDialog from '@/components/InstallGuideDialog.vue';
import { TIKKUN_PROVIDER_SELECTION_OPTIONS, type TikkunProviderSelection } from '@/composables/tikkunProviders';
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
const persistentStorage = usePersistentStorage();

const isStorageProtectionSupported = computed(() => persistentStorage.isSupported.value);
const isStorageProtectionPersisted = computed(() => persistentStorage.isPersisted.value);
const isStorageProtectionChecking = computed(() => persistentStorage.isChecking.value);

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

const tikkunProvider = computed<TikkunProviderSelection>({
  get: () => optionsStore.tikkunProvider,
  set: (value) => optionsStore.changeTikkunProvider(value),
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

const tikkunProviderOptions = computed(() => {
  return TIKKUN_PROVIDER_SELECTION_OPTIONS.map((option) => ({
    title: t(option.nameKey),
    description: t(option.descriptionKey),
    faviconUrl: option.faviconUrl,
    value: option.id,
  }));
});

const showInstallGuideEntry = computed(() => smAndDown.value && !isStandalone.value);

const storageProtectionStatusLabel = computed(() => {
  if (!isStorageProtectionSupported.value) return t('settings.storageProtection.unsupported');
  if (isStorageProtectionPersisted.value) return t('settings.storageProtection.protected');
  return t('settings.storageProtection.bestEffort');
});

const storageProtectionColor = computed(() => {
  if (!isStorageProtectionSupported.value) return 'default';
  return isStorageProtectionPersisted.value ? 'success' : 'warning';
});

const storageProtectionHelp = computed(() => {
  if (!isStorageProtectionSupported.value) return t('settings.storageProtection.unsupportedHelp');
  if (isStorageProtectionPersisted.value) return t('settings.storageProtection.protectedHelp');
  return isStandalone.value
    ? t('settings.storageProtection.bestEffortHelpStandalone')
    : t('settings.storageProtection.bestEffortHelpBrowser');
});

const close = (): void => {
  dialog.value = false;
};

const openInstallGuide = (): void => {
  installGuideDialog.value = true;
};

const requestStorageProtection = async (): Promise<void> => {
  await persistentStorage.requestPersistence();
};

onMounted(() => {
  void persistentStorage.refreshPersistenceStatus();
});
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

.provider-selection {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.storage-protection__header,
.storage-protection__actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.storage-protection__actions {
  flex-wrap: wrap;
  justify-content: flex-start;
}
</style>
