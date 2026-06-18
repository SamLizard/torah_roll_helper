<template>
  <div class="preview-tikkun-section">
    <div v-if="warningText" class="text-caption text-warning preview-tikkun-warning">
      <v-icon size="14" class="me-1">mdi-alert-outline</v-icon>
      {{ warningText }}
    </div>

    <v-btn
      color="primary"
      variant="tonal"
      prepend-icon="mdi-open-in-new"
      data-tutorial="page-preview-link"
      :href="link?.url ?? undefined"
      target="_blank"
      rel="noopener noreferrer"
      :disabled="!link"
      class="preview-open-btn"
      @click="open"
    >
      {{ openLabel }}
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDisplay } from 'vuetify';
import { useOptionsStore } from '@/stores/options';
import type { TikkunResolvedLink } from '@/composables/tikkunProviders';

const props = defineProps<{
  link: TikkunResolvedLink | null;
}>();

const emit = defineEmits<{
  (e: 'open'): void;
}>();

const { t } = useI18n();
const { smAndDown } = useDisplay();
const optionsStore = useOptionsStore();

const providerName = computed(() =>
  props.link ? t(props.link.providerNameKey) : t('settings.tikkunProviders.auto.name')
);

const openLabel = computed(() =>
  smAndDown.value ? t('preview.openTikkunShort') : t('preview.openTikkun', { provider: providerName.value })
);

const providerLayoutLabel = computed(() => {
  const [layoutKey] = props.link?.providerSupportedLayoutKeys ?? [];
  return layoutKey ? t(`settings.torahTypeOptions.klaf_${layoutKey}`) : '';
});

const currentLayoutLabel = computed(() => t(`settings.torahTypeOptions.${optionsStore.torahType}`));

const warningText = computed(() => {
  if (!props.link?.hasLayoutWarning) return '';

  return t('preview.tikkunLayoutWarning', {
    provider: providerName.value,
    providerLayout: providerLayoutLabel.value,
    layout: currentLayoutLabel.value,
  });
});

const open = () => {
  if (!props.link) return;
  emit('open');
};
</script>

<style scoped>
.preview-tikkun-section {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.preview-tikkun-warning {
  display: flex;
  align-items: center;
  text-align: end;
}

.preview-open-btn {
  max-width: 100%;
  min-width: 0;
}

.preview-open-btn :deep(.v-btn__content) {
  white-space: normal;
  line-height: 1.15;
  text-align: center;
}
</style>