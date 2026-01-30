<template>
  <!-- TODO 11: The book (i18n) + perek (+ verse if there is one) should be displayed in the component -->
  <!-- PARTIALLY DONE: it is not working when the page was chosen manually -->
  <v-card class="h-100 d-flex flex-column" variant="outlined" style="border-radius: 16px;">
    <v-card-item>
      <template #title>
        <div class="text-h6 font-weight-bold">{{ $t(`home.${side}.title`) }}</div>
      </template>
      <template #subtitle>
        <div class="text-caption">{{ $t(`home.${side}.subtitle`) }}</div>
      </template>
      <template #append>
        <div class="d-flex gap-2">
          <v-btn 
            size="small" 
            variant="tonal" 
            color="secondary" 
            prepend-icon="mdi-pencil" 
            @click="isManualOpen = true"
          >
            {{ $t('home.actions.input') }}
          </v-btn>

          <v-btn size="small" variant="tonal" color="primary" prepend-icon="mdi-camera" @click="$emit('open-dicta')">
            {{ $t('home.actions.photo') }}
          </v-btn>
          <v-btn size="small" variant="text" prepend-icon="mdi-format-list-bulleted" @click="$emit('choose-manual')">
            {{ $t('home.actions.choose') }}
          </v-btn>
        </div>
      </template>
    </v-card-item>

    <v-divider />

    <v-card-text class="flex-grow-1 d-flex align-center justify-center">
      <div v-if="page !== null" class="text-center w-100">
        <!-- TODO 4: display the name of the page. Base on the selection if manually selected, or if fits exactly a reading. Else take from json. -->
        <!-- So, there should be a utils method that returns the title id based on the page number, for the case that it doesn't have a selection from the options (TargetOptionsGrid) -->
        <!-- The method checks the readings for a corresponding, and if there isn't, get the page id/ids from page_titles_keys.json. -->
        <!-- When there are multiple ids, join them using / (take from i18n, because hebrew "/" is "\", and english/french "/" is "/"...) -->
        <div class="text-h2 font-weight-black text-primary mb-2">{{ page }}</div>
        <div class="text-caption text-medium-emphasis text-uppercase">{{ $t('page') }}</div>
        
        <div v-if="displayString" class="text-subtitle-1 font-weight-medium mt-2 text-primary">
          {{ displayString }}
        </div>

        <v-btn class="mt-4" size="small" color="error" variant="text" @click="clear">
          {{ $t('home.actions.clear') }}
        </v-btn>
      </div>

      <div v-else class="text-center text-medium-emphasis py-6">
        <v-icon size="48" class="mb-2 opacity-50">mdi-book-open-page-variant-outline</v-icon>
        <div>{{ $t('home.noSelection') }}</div>
      </div>
    </v-card-text>

    <v-card-actions v-if="side === 'to' && allowPhotoForTo" class="bg-grey-lighten-5">
      <small class="text-caption text-medium-emphasis mx-auto">
        {{ $t('home.to.canUsePhoto') }}
      </small>
    </v-card-actions>
    
    <ManualEntryDialog 
      v-model="isManualOpen"
      :initial-data="currentRef"
      @save="onManualSave"
      @draft="onManualDraft"
    />
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import ManualEntryDialog, { type ManualData } from './ManualEntryDialog.vue';

const props = defineProps({
  side: { type: String as () => 'from' | 'to', required: true },
  page: { type: Number as () => number | null, default: null },
  allowPhotoForTo: { type: Boolean, default: false }
});

const emit = defineEmits<{
  (e: 'open-dicta'): void;
  (e: 'choose-manual'): void;
  (e: 'manual-set', page: number | null): void;
}>();

const { t } = useI18n();
const isManualOpen = ref(false);

// Stores the draft/selected book, chapter, verse
const currentRef = ref<ManualData>({
  book: 1,
  chapter: null,
  verse: null
});

// Helper to map book ID to i18n key
const BOOKS = ['genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy'];

// Logic for TODO 11
const displayString = computed(() => {
  // Only display if we have a valid page and the manual data matches expectations
  // (Optional: You could add logic here to hide this if the page was set via Target/Dicta 
  // and doesn't match the manual entry, but for now we stick to the manual entry state)
  if (!currentRef.value.chapter || !currentRef.value.verse) return '';
  
  const bookName = t(`group.${BOOKS[currentRef.value.book - 1]}`);
  return `${bookName} ${currentRef.value.chapter}:${currentRef.value.verse}`;
});

const onManualSave = (data: ManualData, page: number) => {
  currentRef.value = data;
  emit('manual-set', page);
};

// Live Draft (While typing) - Only updates if NO page is selected
const onManualDraft = (data: ManualData) => {
  if (props.page === null) {
    currentRef.value = data;
  }
};

const clear = () => {
  emit('manual-set', null);
  // We do NOT clear currentRef here. 
  // This means if the user clears the page, the "Draft" remains in memory 
  // and will appear if they open the input dialog again.
};
</script>

<style scoped>
.gap-2 {
  gap: 8px;
}
</style>