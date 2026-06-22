<template>
  <v-sheet
    class="saved-scrolls-panel pa-3"
    border
    rounded="lg"
    elevation="0"
  >
    <div class="saved-scrolls-panel__header">
      <div class="saved-scrolls-panel__title">
        <v-icon size="20" color="primary">mdi-bookshelf</v-icon>
        <span class="text-subtitle-2 font-weight-bold">{{ $t('savedScrolls.title') }}</span>
      </div>

      <v-btn
        icon="mdi-plus"
        size="small"
        variant="tonal"
        color="primary"
        :aria-label="$t('savedScrolls.create')"
        @click="toggleCreateForm"
      >
        <v-tooltip activator="parent" location="bottom">{{ $t('savedScrolls.create') }}</v-tooltip>
      </v-btn>
    </div>

    <div class="text-caption text-medium-emphasis mt-2">
      {{ $t('savedScrolls.localOnlyNote') }}
    </div>

    <v-expand-transition>
      <div v-if="isCreateOpen" class="saved-scrolls-panel__create mt-3">
        <v-text-field
          v-model="newScrollName"
          :label="$t('savedScrolls.nameLabel')"
          variant="outlined"
          density="compact"
          hide-details="auto"
          maxlength="80"
          @keydown.enter.prevent="createScroll"
        />
        <v-btn
          color="primary"
          variant="tonal"
          prepend-icon="mdi-content-save-outline"
          :disabled="!canCreateScroll"
          @click="createScroll"
        >
          {{ $t('savedScrolls.save') }}
        </v-btn>
      </div>
    </v-expand-transition>

    <div class="saved-scrolls-panel__row mt-3">
      <v-select
        v-model="selectedScrollId"
        :items="savedScrollItems"
        item-title="title"
        item-value="value"
        :label="$t('savedScrolls.selectLabel')"
        :placeholder="$t('savedScrolls.empty')"
        variant="outlined"
        density="compact"
        hide-details="auto"
        class="saved-scrolls-panel__select"
        :disabled="!hasSavedScrolls"
      >
        <template #item="{ props: itemProps, item }">
          <v-list-item
            v-bind="itemProps"
            :title="item.raw.title"
            :subtitle="item.raw.subtitle"
          />
        </template>
      </v-select>

      <div class="saved-scrolls-panel__actions">
        <v-btn
          icon="mdi-book-arrow-left-outline"
          size="small"
          color="primary"
          variant="tonal"
          :disabled="!activeScroll"
          :aria-label="$t('savedScrolls.use')"
          @click="applyActiveScroll"
        >
          <v-tooltip activator="parent" location="bottom">{{ $t('savedScrolls.use') }}</v-tooltip>
        </v-btn>

        <v-btn
          icon="mdi-bookmark-check-outline"
          size="small"
          variant="tonal"
          :disabled="!activeScroll || !canSaveFrom"
          :aria-label="$t('savedScrolls.updateFrom')"
          @click="updateActiveFrom"
        >
          <v-tooltip activator="parent" location="bottom">{{ $t('savedScrolls.updateFrom') }}</v-tooltip>
        </v-btn>

        <v-btn
          icon="mdi-map-marker-check-outline"
          size="small"
          variant="tonal"
          :disabled="!activeScroll || !canSaveTo"
          :aria-label="$t('savedScrolls.updateAfterReading')"
          @click="updateActiveTo"
        >
          <v-tooltip activator="parent" location="bottom">{{ $t('savedScrolls.updateAfterReading') }}</v-tooltip>
        </v-btn>

        <v-btn
          icon="mdi-delete-outline"
          size="small"
          color="error"
          variant="text"
          :disabled="!activeScroll"
          :aria-label="$t('savedScrolls.delete')"
          @click="deleteActiveScroll"
        >
          <v-tooltip activator="parent" location="bottom">{{ $t('savedScrolls.delete') }}</v-tooltip>
        </v-btn>
      </div>
    </div>

    <div v-if="activeScroll" class="saved-scrolls-panel__summary text-caption text-medium-emphasis mt-2">
      {{ activeScrollSummary }}
    </div>
  </v-sheet>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useSavedScrollsStore, type SavedScroll } from '@/stores/savedScrolls';
import type { ManualData } from '@/types';
import type { TorahTypeOption } from '@/stores/options';

const props = withDefaults(defineProps<{
  currentTorahType: TorahTypeOption;
  currentFromPage?: number | null;
  currentFromRef?: ManualData | null;
  currentFromTargetKey?: string | null;
  currentToPage?: number | null;
  currentToRef?: ManualData | null;
  currentToTargetKey?: string | null;
  currentToEndPage?: number | null;
  currentToEndRef?: ManualData | null;
  currentToEndTargetKey?: string | null;
}>(), {
  currentFromPage: null,
  currentFromRef: null,
  currentFromTargetKey: null,
  currentToPage: null,
  currentToRef: null,
  currentToTargetKey: null,
  currentToEndPage: null,
  currentToEndRef: null,
  currentToEndTargetKey: null,
});

const emit = defineEmits<{
  (e: 'apply', scroll: SavedScroll): void;
}>();

const { t } = useI18n();
const savedScrollsStore = useSavedScrollsStore();
const { savedScrolls, activeScroll, hasSavedScrolls } = storeToRefs(savedScrollsStore);
const isCreateOpen = ref(false);
const newScrollName = ref('');

const selectedScrollId = computed<string | null>({
  get: () => savedScrollsStore.activeScrollId,
  set: (value) => savedScrollsStore.setActiveScroll(value),
});

const canSaveFrom = computed(() => props.currentFromPage != null);
const canSaveTo = computed(() => props.currentToEndPage != null || props.currentToPage != null);
const canCreateScroll = computed(() => newScrollName.value.trim().length > 0);

const getLayoutLabel = (torahType: TorahTypeOption): string => {
  return t(`settings.torahTypeOptions.${torahType}`);
};

const getScrollPositionLabel = (scroll: SavedScroll): string => {
  if (!scroll.lastPosition) return t('savedScrolls.noPosition');
  return t('savedScrolls.positionSummary', { page: scroll.lastPosition.page });
};

const getScrollSummary = (scroll: SavedScroll): string => {
  return t('savedScrolls.summary', {
    layout: getLayoutLabel(scroll.torahType),
    position: getScrollPositionLabel(scroll),
  });
};

const savedScrollItems = computed(() => savedScrolls.value.map((scroll) => ({
  title: scroll.name,
  subtitle: getScrollSummary(scroll),
  value: scroll.id,
})));

const activeScrollSummary = computed(() => {
  if (!activeScroll.value) return '';
  return getScrollSummary(activeScroll.value);
});

const getFromPosition = () => ({
  page: props.currentFromPage,
  ref: props.currentFromRef,
  targetKey: props.currentFromTargetKey,
});

const getToPosition = () => ({
  page: props.currentToEndPage ?? props.currentToPage,
  ref: props.currentToEndRef ?? props.currentToRef,
  targetKey: props.currentToEndTargetKey ?? props.currentToTargetKey,
});

const toggleCreateForm = (): void => {
  isCreateOpen.value = !isCreateOpen.value;
};

const createScroll = (): void => {
  if (!canCreateScroll.value) return;

  savedScrollsStore.addScroll({
    name: newScrollName.value,
    torahType: props.currentTorahType,
    position: canSaveFrom.value ? getFromPosition() : undefined,
  });

  newScrollName.value = '';
  isCreateOpen.value = false;
};

const updateActiveFrom = (): void => {
  if (!activeScroll.value || !canSaveFrom.value) return;

  savedScrollsStore.updateScroll(activeScroll.value.id, {
    torahType: props.currentTorahType,
    position: getFromPosition(),
  });
};

const updateActiveTo = (): void => {
  if (!activeScroll.value || !canSaveTo.value) return;

  savedScrollsStore.updateScroll(activeScroll.value.id, {
    torahType: props.currentTorahType,
    position: getToPosition(),
  });
};

const applyActiveScroll = (): void => {
  if (!activeScroll.value) return;
  emit('apply', activeScroll.value);
};

const deleteActiveScroll = (): void => {
  if (!activeScroll.value) return;
  savedScrollsStore.removeScroll(activeScroll.value.id);
};
</script>

<style scoped>
.saved-scrolls-panel {
  background: rgba(var(--v-theme-surface), 0.92);
}

.saved-scrolls-panel__header,
.saved-scrolls-panel__title,
.saved-scrolls-panel__row,
.saved-scrolls-panel__actions {
  display: flex;
  align-items: center;
}

.saved-scrolls-panel__header {
  justify-content: space-between;
  gap: 12px;
}

.saved-scrolls-panel__title {
  gap: 8px;
  min-width: 0;
}

.saved-scrolls-panel__row {
  gap: 8px;
  align-items: flex-start;
}

.saved-scrolls-panel__select {
  min-width: 0;
  flex: 1 1 280px;
}

.saved-scrolls-panel__actions {
  gap: 4px;
  flex-wrap: wrap;
  justify-content: flex-end;
  padding-top: 2px;
}

.saved-scrolls-panel__create {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: start;
}

.saved-scrolls-panel__summary {
  overflow-wrap: anywhere;
}

@media (max-width: 600px) {
  .saved-scrolls-panel__row,
  .saved-scrolls-panel__create {
    display: flex;
    flex-direction: column;
  }

  .saved-scrolls-panel__select,
  .saved-scrolls-panel__create > * {
    width: 100%;
  }

  .saved-scrolls-panel__actions {
    width: 100%;
  }
}
</style>